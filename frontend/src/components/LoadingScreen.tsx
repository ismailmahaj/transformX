export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a]">
      <p className="text-2xl font-bold text-white mb-4">TransformX</p>
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
      <p className="text-sm text-gray-400">Chargement...</p>
    </div>
  );
}
