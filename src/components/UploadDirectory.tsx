import React, { ChangeEvent } from "react";
import { storage } from "wxt/storage";
import { Commit } from "@/types";

export const COMMIT_STORAGE_KEY = "local:commit";

const getFilesContent = async (files: FileList): Promise<any[]> => {
  const filePromises = Array.from(files).map((file) => {
    return new Promise<any>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const content = JSON.parse(event.target?.result as string);
        resolve(content);
      };

      reader.onerror = () => {
        reject(new Error(`Error reading ${file.name}`));
      };

      reader.readAsText(file);
    });
  });

  return await Promise.all(filePromises);
};

const isCommit = (content: any): content is Commit => {
  return content.url && content.nodes && content.edges;
};

const handleFolderSelection = async (event: ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files;
  if (!files) {
    return;
  }

  const filesContent = await getFilesContent(files);
  console.log(filesContent);
  const content = filesContent.find((content) => isCommit(content));
  if (!content) {
    return;
  }

  await storage.setItem(COMMIT_STORAGE_KEY, content);
  await browser.tabs.create({ url: content.url + "?diff=split" });
};

export const DirectoryUploader = () => {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {}, [ref]);

  return (
    <div>
      <div>
        <input
          type="file"
          ref={ref}
          style={{ display: "none" }}
          onChange={handleFolderSelection}
        />
        <button onClick={() => ref.current?.click()}>Upload File</button>
      </div>
    </div>
  );
};
