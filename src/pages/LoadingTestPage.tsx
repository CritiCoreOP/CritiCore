import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";

const LoadingTestPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-[70vh] gap-6">
          <M3LoadingIndicator size={96} label="Lädt für immer…" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LoadingTestPage;
