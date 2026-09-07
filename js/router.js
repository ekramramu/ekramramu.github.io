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
  return hash || "/dashboard";
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
