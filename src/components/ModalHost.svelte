<script lang="ts">
import {modal} from "../stores/modalStore";
</script>

{#if $modal.component}
  <svelte:component
    this={$modal.component}
    {...$modal.props}
  />
{/if}