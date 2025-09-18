import { closeMainWindow, getPreferenceValues, popToRoot } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { Preferences, Tab } from "../interfaces";
import { SEARCH_ENGINE } from "../constants";

const execAsync = promisify(exec);

function executeCommand(command: string) {
  return execAsync(`powershell.exe -Command "${command}"`);
}

export async function openNewTab(queryText: string | null | undefined): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const preferences = getPreferenceValues<Preferences>();
  const browserApp = preferences.browserApp || "firefox";

  if (queryText) {
    const searchEngine = preferences.searchEngine || "google";
    const searchUrl = SEARCH_ENGINE[searchEngine];
    const fullUrl = `${searchUrl}${encodeURIComponent(queryText)}`;
    const command = `start "${browserApp}" "${fullUrl}"`;

    const { stdout } = await execAsync(command);
    return stdout || "success";
  } else {
    const command = `start "${browserApp}" "moz-extension://a99bede1-d2a8-4fc6-a2d2-086bdc547946/index.html"`;

    const { stdout } = await executeCommand(command);
    return stdout || "success";
  }
}

export async function openHistoryTab(url: string): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const preferences = getPreferenceValues<Preferences>();
  const browserApp = preferences.browserApp || "firefox";
  const command = `start "${browserApp}" "${url}"`;

  const { stdout } = await execAsync(command);
  return stdout || "success";
}

export async function setActiveTab(tab: Tab): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const browserApp = preferences.browserApp || "firefox";

  // Instead of trying to find and activate the existing tab,
  // just open the URL which is more reliable and simpler
  const command = `start "${browserApp}" "${tab.url}"`;
  await execAsync(command);
}
