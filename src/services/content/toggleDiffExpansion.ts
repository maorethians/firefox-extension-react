export const toggleDiffExpansion = (diffDiv: Element) => {
  const fileHeader = diffDiv.children.item(0);
  const fileInfo = fileHeader?.children.item(0);
  const expansionButton = fileInfo?.children.item(0);
  if (expansionButton) {
    (expansionButton as HTMLButtonElement).click();
  }
};
