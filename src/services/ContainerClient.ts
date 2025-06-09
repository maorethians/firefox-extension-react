import axios from "axios";
import { Cluster, Hierarchy } from "@/types";
import { UrlHelper } from "@/services/UrlHelper.ts";

export class ContainerClient {
  private static host = "localhost";
  private static port: string = "8080";

  private static getUrl = (endpoint: string) => {
    return `http://${this.host}:${this.port}/api${endpoint}`;
  };

  static check = async () => {
    const url = this.getUrl("/health");
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
        this.getUrl(`/${type}/commit`),
        {
          params: { url: url },
        },
      );
      return returnType as T;
    }

    if (UrlHelper.isPullRequest(url)) {
      const { data: returnType } = await axios.get(
        this.getUrl(`/${type}/pull-request`),
        {
          params: { url },
        },
      );

      return returnType as T;
    }
  };
}
