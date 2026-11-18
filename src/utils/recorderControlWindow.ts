type PictureInPictureHost = Window & {
  documentPictureInPicture?: {
    requestWindow(options: { width: number; height: number }): Promise<Window>;
  };
};

/** Render controls in a blank window; authorization stays in the owning iframe. */
export async function openRecorderControlWindow(): Promise<Window | null> {
  let owner: PictureInPictureHost = window;
  try {
    if (window.parent.location.origin === location.origin) owner = window.parent;
  } catch {
    // Only the trusted same-origin SaaS can own the always-on-top window.
  }
  const pip = owner.documentPictureInPicture;
  if (pip) {
    try {
      return await pip.requestWindow({ width: 420, height: 360 });
    } catch {
      // Browsers may refuse PiP; the user can still use a separate popup.
    }
  }
  return window.open(
    '',
    'relampo-recording-controls-' + location.host,
    'popup=yes,width=420,height=360,resizable=yes,scrollbars=yes',
  );
}

export function styleRecorderControlWindow(target: Window): () => void {
  const root = target.document.documentElement;
  const copyTypography = () => {
    const sourceRoot = getComputedStyle(document.documentElement);
    const sourceBody = getComputedStyle(document.body);
    root.style.fontSize = sourceRoot.fontSize;
    target.document.body.style.fontFamily = sourceBody.fontFamily;
    target.document.body.style.fontSize = sourceBody.fontSize;
    target.document.body.style.lineHeight = sourceBody.lineHeight;
    // Chrome may remember a different zoom for PiP. Match the owning page's
    // apparent scale when both windows are on the same screen.
    const sameScreen = target.screen.width === window.screen.width && target.screen.height === window.screen.height;
    target.document.body.style.zoom =
      sameScreen && target.devicePixelRatio && window.devicePixelRatio
        ? String(window.devicePixelRatio / target.devicePixelRatio)
        : '1';
  };
  const copyAttributes = () => {
    for (const attribute of [...root.attributes]) root.removeAttribute(attribute.name);
    for (const attribute of [...document.documentElement.attributes])
      root.setAttribute(attribute.name, attribute.value);
    copyTypography();
  };
  copyAttributes();
  for (const element of document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style,link[rel="stylesheet"]')) {
    const copy = element.cloneNode(true) as HTMLStyleElement | HTMLLinkElement;
    if (element instanceof HTMLLinkElement) (copy as HTMLLinkElement).href = element.href;
    target.document.head.appendChild(copy);
  }
  target.document.body.style.margin = '0';
  const observer = new MutationObserver(copyAttributes);
  observer.observe(document.documentElement, { attributes: true });
  target.addEventListener('resize', copyTypography);
  window.addEventListener('resize', copyTypography);
  return () => {
    observer.disconnect();
    target.removeEventListener('resize', copyTypography);
    window.removeEventListener('resize', copyTypography);
  };
}
