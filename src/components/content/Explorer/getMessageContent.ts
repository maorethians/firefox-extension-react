export const getMessageContent = () => {
  const messageContainer = document.querySelector(
    '[class*="commit-message-container"]',
  );

  let result = "";

  const firstElementChild = messageContainer?.firstElementChild;
  if (firstElementChild) {
    const commitTitle = firstElementChild.firstElementChild?.innerHTML;
    if (commitTitle) {
      result += commitTitle;
    }
  }

  let currentElement = firstElementChild;
  while (currentElement) {
    const content = currentElement.innerHTML;
    if (content) {
      result += "\n" + content;
    }

    currentElement = currentElement.nextElementSibling;
  }

  return result;
};
