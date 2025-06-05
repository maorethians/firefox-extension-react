import { PORT_STORAGE_KEY } from "@/components/popup/DockerRun.tsx";
import axios from "axios";
import { Cluster, Hierarchy } from "@/types";
import { UrlHelper } from "@/services/UrlHelper.ts";

export class ContainerClient {
  private static host = "localhost";
  private static port: string;

  private static async init() {
    if (!this.port) {
      const port = await storage.getItem(PORT_STORAGE_KEY);
      if (typeof port !== "string") {
        throw new Error("port is not saved");
      }

      this.port = port;
    }
  }

  private static getUrl = async (endpoint: string) => {
    if (!this.port) {
      await this.init();
    }

    return `http://${this.host}:${this.port}/api${endpoint}`;
  };

  static check = async () => {
    const url = await this.getUrl("/health");
    try {
      const res = await axios.get(url, { timeout: 200 });
      return res.status === 200;
    } catch (e) {
      return false;
    }
  };

  static getHierarchy = async (url: string) => {
    return this.get<Hierarchy>("hierarchy", url);
  };

  static getClusters = async (url: string) => {
    return this.get<Cluster[]>("clusters", url);
  };

  private static get = async <T>(
    type: "clusters" | "hierarchy",
    url: string,
  ) => {
    const isServiceUp = await this.check();
    if (!isServiceUp) {
      return;
    }

    if (UrlHelper.isCommit(url) || UrlHelper.isPRCommit(url)) {
      const { data: returnType } = await axios.get(
        await this.getUrl(`/${type}/commit`),
        {
          params: { url: url },
        },
      );
      return returnType as T;
    }

    if (UrlHelper.isPullRequest(url)) {
      const { user, repo, id } = UrlHelper.disassemblePR(url);
      const { data: returnType } = await axios.get(
        await this.getUrl(`/${type}/pull-request`),
        {
          params: { url: `https://github.com/${user}/${repo}`, id },
        },
      );

      return returnType as T;
    }
  };
}
