import type { Workspace } from "../types";

export function getActiveProject(workspace: Workspace) {
  return workspace.projects.find(
    (p) => p.id === workspace.activeProjectId
  );
}

export function addProject(
  workspace: Workspace,
  project: Workspace["projects"][number]
): Workspace {
  return {
    ...workspace,
    projects: [...workspace.projects, project],
  };
}

export function setActiveProject(
  workspace: Workspace,
  projectId: string
): Workspace {
  return {
    ...workspace,
    activeProjectId: projectId,
  };
}