const routes = [];
let notFoundHandler = () => {};
let currentPath = null;

export function registerRoute(path, handler) {
  routes.push({ path, handler });
}

export function setNotFoundHandler(handler) {
  notFoundHandler = handler;
}

export function navigate(path) {
  if (window.location.hash === `#${path}`) {
    handleRouteChange();
  } else {
    window.location.hash = path;
  }
}

export function getCurrentPath() {
  const hash = window.location.hash.replace(/^#/, "");
  const path = hash.split("?")[0] || "/dashboard";
  if (path.startsWith("/tournaments/manage/")) return "/tournaments/manage";
  if (path.startsWith("/players/detail/")) return "/players/detail";
  return path;
}

function handleRouteChange() {
  const path = getCurrentPath();
  currentPath = path;
  const match = routes.find((route) => route.path === path);
  if (match) {
    match.handler(path);
  } else {
    notFoundHandler(path);
  }
}

export function getActivePath() {
  return currentPath;
}

export function startRouter() {
  window.addEventListener("hashchange", handleRouteChange);
  handleRouteChange();
}
