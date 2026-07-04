export function useNodeDetails(api: {
  getDetailsOpen: () => boolean;
  setDetailsOpen: (v: boolean) => void;
}) {
  function toggleDetails() {
    api.setDetailsOpen(!api.getDetailsOpen());
  }

  return {
    toggleDetails,
  };
}
