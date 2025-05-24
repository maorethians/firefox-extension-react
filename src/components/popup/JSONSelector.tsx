import React, { ChangeEvent } from "react";
import { storage } from "wxt/storage";
import { Commit } from "@/types";
import { StorageKey } from "@/services/StorageKey.ts";
import { Button } from "@mui/material";

const getFilesContent = async (files: FileList): Promise<any[]> => {
  const filePromises = Array.from(files).map((file) => {
    return new Promise<any>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        let content = JSON.parse(event.target?.result as string);
        content = {
          ...content,
          clusters: content.clusters.map((cluster: string) =>
            JSON.parse(cluster),
          ),
        };
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
  const content = filesContent.find((content) => isCommit(content));
  if (!content) {
    return;
  }

  await storage.setItem(StorageKey.getWithUrl(content.url), content);
  await browser.tabs.create({ url: content.url + "?diff=split" });
};

export const JSONSelector = () => {
  return (
    <div>
      <Button
        component="label"
        role={undefined}
        variant="contained"
        tabIndex={-1}
      >
        Upload File
        <input
          type="file"
          style={{ display: "none" }}
          onChange={handleFolderSelection}
        />
      </Button>
    </div>
  );
};
