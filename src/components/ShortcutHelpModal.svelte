<!-- SPDX-License-Identifier: GPL-3.0-only -->

<script lang="ts">
  import Modal from "./Modal.svelte";
  import { _ } from "svelte-i18n";
</script>

<Modal title={$_("shortcutHelp.title")}>
  <div class="shortcut-list">
    <div class="shortcut-row">
      <kbd>Ctrl</kbd><span class="plus">+</span><kbd>K</kbd>
      <span class="desc">{$_("shortcutHelp.ctrlK")}</span>
    </div>
    <div class="shortcut-row">
      <kbd>Ctrl</kbd><span class="plus">+</span><kbd>F</kbd>
      <span class="desc">{$_("shortcutHelp.ctrlF")}</span>
    </div>
    <div class="shortcut-row">
      <kbd>Ctrl</kbd><span class="plus">+</span><kbd>Z</kbd>
      <span class="desc">{$_("shortcutHelp.ctrlZ")}</span>
    </div>
    <div class="shortcut-row">
      <kbd>F1</kbd>
      <span class="desc">{$_("shortcutHelp.f1")}</span>
    </div>
  </div>
</Modal>

<style>
  .shortcut-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .desc {
    margin-left: auto;
    color: #9ca3af;
    font-size: 14px;
  }

  kbd {
    display: inline-block;
    padding: 3px 8px;
    font-size: 12px;
    font-family: inherit;
    color: #e7e9ee;
    background: #2a2f37;
    border: 1px solid #3a4049;
    border-radius: 4px;
    min-width: 24px;
    text-align: center;
  }

  .plus {
    color: #6b7280;
    font-size: 12px;
  }
</style>
