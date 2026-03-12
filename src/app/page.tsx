import { Suspense } from "react";

import { AppDashboard } from "@/components/dashboard/app-dashboard";

export default function HomePage() {
  return (
    <Suspense>
      <AppDashboard />
    </Suspense>
  );
}
