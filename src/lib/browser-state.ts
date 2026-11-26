"use client";

import { useSyncExternalStore } from "react";

function subscribeConnection(notify: () => void) {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}
export function useBrowserOnline() {
  return useSyncExternalStore(subscribeConnection, () => navigator.onLine, () => true);
}

function subscribeBranch(notify: () => void) {
  window.addEventListener("branchChanged", notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener("branchChanged", notify);
    window.removeEventListener("storage", notify);
  };
}
function selectedBranch() {
  try { return localStorage.getItem("selectedBranch") || "Main branch"; }
  catch { return "Main branch"; }
}
export function useSelectedBranchName() {
  return useSyncExternalStore(subscribeBranch, selectedBranch, () => "Main branch");
}

function subscribeStorage(notify: () => void) {
  window.addEventListener("storage", notify);
  return () => window.removeEventListener("storage", notify);
}
export function useStoredString(storage: "local" | "session", key: string) {
  return useSyncExternalStore(subscribeStorage, () => {
    try { return (storage === "local" ? localStorage : sessionStorage).getItem(key); }
    catch { return null; }
  }, () => null);
}
function subscribeLocation(notify: () => void) {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
}
export function useBrowserSearch() {
  return useSyncExternalStore(subscribeLocation, () => window.location.search, () => "");
}
