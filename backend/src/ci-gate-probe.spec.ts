// Temporary T11 probe: prove that a failing assertion blocks the remote workflow.
it('T11 controlled CI failure probe', () => {
  expect(true).toBe(false);
});
