import URI from "uri-js";

export class UrlHelper {
  static getId = (url: string) => {
    if (this.isCommit(url)) {
      const match = url.match(
        /^https?:\/\/github\.com\/[^/]+\/[^/]+\/commit\/([^/]+)$/,
      );
      return match![1];
    }

    if (this.isPRCommit(url)) {
      const match = url.match(
        /^https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/commits\/([^/]+)$/,
      );
      return match![1];
    }

    const { user, repo, id } = this.disassemblePR(url);
    return `${user}-${repo}-${id}`;
  };

  static disassemblePR = (url: string) => {
    if (!this.isPullRequest(url)) {
      throw new Error("url is not in the expected format");
    }

    const match = url.match(
      /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/,
    );
    const [, user, repo, id] = match!;
    return { user, repo, id };
  };

  static isCommit = (url: string) =>
    /^https?:\/\/github\.com\/[^/]+\/[^/]+\/commit\/[^/]+$/.test(url);

  static isPRCommit = (url: string) =>
    /^https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/commits\/[^/]+$/.test(
      url,
    );

  static isPullRequest = (url: string) =>
    /https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/.test(url);

  getCommitSha = (url: string) => {
    const match = url.match(/\/(?:commit|commits)\/([a-f0-9]{7,40})/);
    const sha = match ? match[1] : null;
    if (!sha) {
      throw new Error("Invalid url");
    }

    return sha;
  };

  static purify = (url: string): any => {
    const uri = URI.parse(window.location.href);
    const { userinfo, port, query, fragment, ...pureUri } = uri;
    let pureUrl = URI.serialize(pureUri);

    // PR page ends with "/files" but RM requires PR root url
    if (pureUrl.endsWith("/files")) {
      pureUrl = pureUrl.replace(/\/files$/, "");
    }

    return pureUrl;
  };
}
