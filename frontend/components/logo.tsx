export default function Logo({ className = "" }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <div className="w-8 h-8 bg-blue-600 rounded-lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-full" />
        </div>
      </div>
    </div>
  );
}
