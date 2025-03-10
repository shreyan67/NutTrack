import { useState } from "react";
import { Header } from "@/components/Header";
import { DailyView } from "@/components/DailyView";
import { CalendarView } from "@/components/CalendarView";
import { ReportsView } from "@/components/ReportsView";

type Tab = "daily" | "calendar" | "reports";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("daily");
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("daily")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "daily"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Daily Log
              </button>
              <button
                onClick={() => setActiveTab("calendar")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "calendar"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "reports"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Reports
              </button>
            </nav>
          </div>
          
          {/* Content based on active tab */}
          {activeTab === "daily" && <DailyView />}
          {activeTab === "calendar" && <CalendarView />}
          {activeTab === "reports" && <ReportsView />}
        </div>
      </main>
    </div>
  );
}
