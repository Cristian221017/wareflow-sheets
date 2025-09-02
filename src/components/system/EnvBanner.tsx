import { ENV } from '@/config/env';

export default function EnvBanner() {
  if (ENV.APP_ENV !== 'staging') return null;
  
  return (
    <div className="w-full bg-yellow-500/90 text-black text-sm px-3 py-1 text-center z-50 fixed top-0 left-0 right-0">
      Ambiente: <b>STAGING</b> — {ENV.APP_NAME}
    </div>
  );
}