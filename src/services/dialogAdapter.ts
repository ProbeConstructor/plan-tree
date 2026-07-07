import type { TreeNode } from "../types";

const isTauri = typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

/**
 * Abre el diálogo "Guardar como" y escribe el JSON del árbol en la ruta elegida.
 * Devuelve true si se guardó, false si el usuario canceló.
 */
export async function exportTree(data: TreeNode): Promise<boolean> {
  const json = JSON.stringify(data, null, 2);

  if (isTauri) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");

    const path = await save({
      defaultPath: "plan-tree-export.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return false;

    await writeTextFile(path as string, json);
    return true;
  }

  // Web descartado, pero por si las moscas
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plan-tree-export.json";
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function importTree(): Promise<TreeNode | null> {
  if (isTauri) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");

    const path = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!path || Array.isArray(path)) return null;

    const text = await readTextFile(path);
    return JSON.parse(text);
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);

      const reader = new FileReader();
      reader.onload = () => resolve(JSON.parse(reader.result as string));
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
