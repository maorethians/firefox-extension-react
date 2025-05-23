export const OPEN_TAB_MESSAGE = "OpenTab";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === OPEN_TAB_MESSAGE) {
      browser.tabs.create({ url: message.url });
    }
  });
});
