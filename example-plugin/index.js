// Example plugin for plan-tree
// Copy this directory to ~/.config/plan-tree/plugins/example-plugin/
// to test plugin loading.

/**
 * @param {import("../../src/types").PluginAPI} api
 */
export function activate(api) {
  console.log("[Example Plugin] Activated!");

  // Register a command
  api.commands.register({
    id: "example:hello",
    label: "Example: Hello World",
    category: "utilities",
    icon: "👋",
    enabled: () => true,
    action: () => {
      const greeting = api.settings.get("greeting") ?? "Hello from plugin!";
      alert(greeting);
    },
  });

  // Inject custom CSS
  api.css.inject(`
    .plugin-example-banner {
      padding: 8px 16px;
      background: #22c55e22;
      border-left: 3px solid #22c55e;
      font-size: 12px;
      color: var(--text-secondary);
    }
  `);

  // Listen for node changes
  api.events.onNodeChange((node, type) => {
    console.log(`[Example Plugin] Node ${type}: ${node.title}`);
  });
}

export function deactivate() {
  console.log("[Example Plugin] Deactivated!");
}
