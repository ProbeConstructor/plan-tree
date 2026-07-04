<script lang="ts">
  export let progress: number;
  export let progressColor: string;
</script>

<div class="bar">
  <div
    class="bar-fill"
    style="width:{progress}%;background:{progressColor};"
  ></div>
</div>

<style>
  .bar {
    width: 150px;
    height: 6px;
    background: #0f1115;
    border-radius: 4px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    transition: width 0.2s ease;
  }
</style>
