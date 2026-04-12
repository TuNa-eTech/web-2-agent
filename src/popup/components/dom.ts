export type ChildNodeInput = HTMLElement | Text | string | null | undefined;

type ElementOptions = {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
};

export const el = (
  tag: string,
  options: ElementOptions = {},
  children: ChildNodeInput[] = [],
): HTMLElement => {
  const node = document.createElement(tag);
  if (options.className) {
    node.className = options.className;
  }
  if (options.text !== undefined) {
    node.textContent = options.text;
  }
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      node.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (!child) {
      continue;
    }
    if (typeof child === "string") {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  }
  return node;
};
