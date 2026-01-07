import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  lazy,
  Suspense,
  useCallback,
  memo,
} from "react";
import api from "../../utils/axios.js";
import {
  Users,
  UserCheck,
  Shield,
  CheckCircle,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Handshake,
  Download,
  BarChart3,
  FileText,
} from "lucide-react";
import Header from "../../components/Header/Header";
import Alert from "../../components/Alert/Alert";
import { useAuthStore } from "../../store/AuthStore";
import {
  format,
  parseISO,
  subDays,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfDay,
  differenceInDays,
  isWithinInterval,
} from "date-fns";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";

// 🔥 IMPORT CHART SETUP
import { registerChartComponents } from "../../utils/chartSetup.js";

// LIGHTWEIGHT IMPORTS
import StatCard from "../../components/StatCard/StatCard";
import QuickActionCard from "../../components/QuickActionCard/QuickActionCard";
import RecentEventsTimeline from "../../components/RecentEventsTimeline/RecentEventsTimeline";
import ContactDiversityOverview from "../../components/ContactDiversityOverview/ContactDiversityOverview";
import OnlineUsersCard from "../../components/OnlineUsersCard/OnlineUsersCard";

// 🔥 LAZY LOAD CHARTS
const ContactsChart = lazy(() =>
  import("../../components/ContactsChart/ContactsChart")
);
const SkillsHorizontalBarChart = lazy(() =>
  import(
    "../../components/SkillsHorizontalBarChart/SkillsHorizontalBarChart.jsx"
  )
);
const EventsBarChart = lazy(() =>
  import("../../components/EventsBarChart/EventsBarChart")
);
const ContactSourceAnalytics = lazy(() =>
  import("../../components/ContactSourceAnalytic/ContactSourceAnalytic")
);
const UserActivitySegmentation = lazy(() =>
  import("../../components/UserActivitySegmentation/UserActivitySegmentation")
);

// Utility functions
const calculateTrendPercentage = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const calculateVerifiedPercentage = (verified, total) => {
  if (total === 0) return 0;
  return Math.round((verified / total) * 100);
};

const calculateCompletionPercentage = (complete, total) => {
  if (total === 0) return 0;
  return Math.round((complete / total) * 100);
};

const calculateAcquisitionRates = (contacts) => {
  const now = new Date();
  const startOfToday = startOfDay(now);
  const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const startOfThisMonth = startOfMonth(now);

  const todaysContacts = contacts.filter((c) => {
    if (!c.created_at) return false;
    const createdAt = parseISO(c.created_at);
    return isWithinInterval(createdAt, {
      start: startOfToday,
      end: endOfDay(now),
    });
  });

  const thisWeekContacts = contacts.filter((c) => {
    if (!c.created_at) return false;
    const createdAt = parseISO(c.created_at);
    return isWithinInterval(createdAt, { start: startOfThisWeek, end: now });
  });

  const thisMonthContacts = contacts.filter((c) => {
    if (!c.created_at) return false;
    const createdAt = parseISO(c.created_at);
    return isWithinInterval(createdAt, { start: startOfThisMonth, end: now });
  });

  const daysInMonth = differenceInDays(now, startOfThisMonth) + 1;
  const daysInWeek = differenceInDays(now, startOfThisWeek) + 1;

  return {
    daily: todaysContacts.length,
    weekly:
      Math.round((thisWeekContacts.length / Math.max(1, daysInWeek)) * 10) / 10,
    monthly:
      Math.round((thisMonthContacts.length / Math.max(1, daysInMonth)) * 10) /
      10,
    todaysContacts: todaysContacts.length,
    thisWeekContacts: thisWeekContacts.length,
    thisMonthContacts: thisMonthContacts.length,
  };
};

// 🔥 FIXED: Calculate distinct events with advanced normalization
const calculateUniqueEvents = (contacts) => {
  const uniqueEventNames = new Set();

  contacts.forEach((contact) => {
    if (contact.events && Array.isArray(contact.events)) {
      contact.events.forEach((event) => {
        if (event.event_name) {
          // Advanced normalization: Unicode, trim, lowercase, remove special chars
          const normalizedEventName = event.event_name
            .normalize("NFD") // Unicode normalization
            .trim() // Remove leading/trailing spaces
            .toLowerCase() // Convert to lowercase
            .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
            .replace(/[^a-z0-9]/g, ""); // Remove special characters and spaces

          if (normalizedEventName) {
            // Only add non-empty strings
            uniqueEventNames.add(normalizedEventName);
          }
        }
      });
    }
  });

  return uniqueEventNames.size;
};

// 🔥 INTERSECTION OBSERVER FOR LAZY CHART LOADING
const LazyChart = memo(({ children, minHeight = "400px" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setTimeout(() => {
            setIsVisible(true);
            setHasLoaded(true);
          }, 100);
          observer.disconnect();
        }
      },
      {
        rootMargin: "100px",
        threshold: 0.01,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasLoaded]);

  return (
    <div ref={ref} style={{ minHeight }}>
      {isVisible ? (
        children
      ) : (
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="skeleton-pulse">
            <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      )}
    </div>
  );
});

LazyChart.displayName = "LazyChart";

// Skeleton components
const StatCardSkeleton = memo(() => (
  <div className="bg-white rounded-lg p-6 shadow-lg">
    <div className="skeleton-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
      <div className="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
    </div>
  </div>
));

StatCardSkeleton.displayName = "StatCardSkeleton";

const ChartSkeleton = memo(({ title }) => (
  <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
    <div className="skeleton-pulse">
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 bg-gray-300 rounded"></div>
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
        </div>
      )}
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  </div>
));

ChartSkeleton.displayName = "ChartSkeleton";

// Main Admin Component
function Admin() {
  const navigate = useNavigate();
  const { id, role } = useAuthStore();

  const [dataLoaded, setDataLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartsDataReady, setChartsDataReady] = useState(false);

  const [stats, setStats] = useState({
    totalContacts: 0,
    verifiedContacts: 0,
    totalEvents: 0,
    dataQualityScore: 0,
    monthlyAcquisitionRate: 0,
    weeklyAcquisitionRate: 0,
    dailyAcquisitionRate: 0,
    linkedinConnections: 0,
    completeProfiles: 0,
    unverifiedContacts: 0,
    totalContactsTrend: 0,
    verifiedContactsTrend: 0,
    monthlyAcquisitionTrend: 0,
    linkedinTrend: 0,
    completeProfilesTrend: 0,
    totalEventsTrend: 0,
  });

  const [contacts, setContacts] = useState([]);
  const [modificationHistory, setModificationHistory] = useState([]);
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [dateRangeType, setDateRangeType] = useState("custom");

  const [alert, setAlert] = useState({
    isOpen: false,
    severity: "success",
    message: "",
  });

  const [importProgress, setImportProgress] = useState({
    show: false,
    status: "",
    processed: 0,
    total: 0,
  });

  const showAlert = useCallback((severity, message) => {
    setAlert({ isOpen: true, severity, message });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // 🔥 REGISTER CHART.JS ON MOUNT
  useEffect(() => {
    registerChartComponents();
  }, []);

  // 🔥 MEMOIZE & SAMPLE CONTACTS (max 500 for better performance)
  const sampledContacts = useMemo(() => {
    if (contacts.length <= 500) return contacts;
    const step = Math.ceil(contacts.length / 500);
    return contacts.filter((_, index) => index % step === 0);
  }, [contacts]);

  // Fetch modification history in background
  useEffect(() => {
    if (!dataLoaded) return;

    const fetchModificationHistory = async () => {
      try {
        const response = await api.get(
          "/contact/get-all-modification-history/"
        );
        const data = response.data;
        if (data.success && data.data) {
          const limitedData = data.data.slice(-500);
          setModificationHistory(limitedData);
          // console.log(
          //   "📊 Modification history loaded:",
          //   limitedData.length,
          //   "records"
          // );
          setChartsDataReady(true);
        }
      } catch (error) {
        // console.error("Failed to fetch modification history:", error);
        setChartsDataReady(true);
      }
    };

    const timer = setTimeout(() => {
      fetchModificationHistory();
    }, 800);

    return () => clearTimeout(timer);
  }, [dataLoaded]);

  const fetchDashboardData = useCallback(
    async (isRefresh = false) => {
      if (!id) return;

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        }

        const [allContactsResponse, unverifiedContactsResponse] =
          await Promise.all([
            api.get("/contact/get-all-contact/"),
            api.get("/contact/get-unverified-contacts/"),
          ]);

        const allContacts = allContactsResponse.data?.data || [];
        const unverifiedContacts = unverifiedContactsResponse.data?.data || [];

        setContacts(allContacts);

        const totalContacts = allContacts.length;
        const verifiedContacts = allContacts.filter((c) => {
          const hasVerifiedEvents =
            c.events && c.events.some((event) => event.verified);
          const isDirectlyVerified = c.verified;
          const hasApprovedStatus =
            c.contact_status && c.contact_status.includes("approved");
          return hasVerifiedEvents || isDirectlyVerified || hasApprovedStatus;
        }).length;

        const completeProfiles = allContacts.filter(
          (c) => c.email_address && c.phone_number && c.skills && c.company_name
        ).length;

        const linkedinConnections = allContacts.filter(
          (c) => c.linkedin_url
        ).length;
        const dataQualityScore =
          Math.round((completeProfiles / totalContacts) * 100) || 0;

        // 🔥 FIXED: Calculate distinct events using advanced normalization
        const totalEvents = calculateUniqueEvents(allContacts);

        // 🔥 DEBUG: Log to see what's being counted
        // console.log("📊 Distinct Events Count:", totalEvents);

        const rates = calculateAcquisitionRates(allContacts);

        const yesterday = subDays(new Date(), 1);
        const yesterdayStart = startOfDay(yesterday);
        const yesterdayEnd = endOfDay(yesterday);
        const yesterdayNewContacts = allContacts.filter((c) => {
          if (!c.created_at) return false;
          const createdAt = parseISO(c.created_at);
          return isWithinInterval(createdAt, {
            start: yesterdayStart,
            end: yesterdayEnd,
          });
        }).length;

        const totalContactsTrend = calculateTrendPercentage(
          rates.todaysContacts,
          yesterdayNewContacts
        );
        const verifiedContactsPercentage = calculateVerifiedPercentage(
          verifiedContacts,
          totalContacts
        );
        const completeProfilesPercentage = calculateCompletionPercentage(
          completeProfiles,
          totalContacts
        );

        setStats({
          totalContacts,
          verifiedContacts,
          totalEvents, // 🔥 Now using proper distinct count
          dataQualityScore,
          monthlyAcquisitionRate: rates.monthly,
          weeklyAcquisitionRate: rates.weekly,
          dailyAcquisitionRate: rates.daily,
          linkedinConnections,
          completeProfiles,
          unverifiedContacts: unverifiedContacts.length,
          totalContactsTrend,
          verifiedContactsTrend: verifiedContactsPercentage,
          monthlyAcquisitionTrend: totalContactsTrend,
          linkedinTrend: 0,
          completeProfilesTrend: completeProfilesPercentage,
          totalEventsTrend: 0,
        });

        setDataLoaded(true);
        setIsRefreshing(false);

        setTimeout(async () => {
          try {
            const unverifiedImagesResponse = await api.get(
              "/contact/get-unverified-images/"
            );
            const unverifiedImages = unverifiedImagesResponse.data?.data || [];
            const totalUnverifiedContacts =
              unverifiedImages.length + unverifiedContacts.length;
            setStats((prev) => ({
              ...prev,
              unverifiedContacts: totalUnverifiedContacts,
            }));
          } catch (err) {
            // console.error("Error fetching secondary data:", err);
          }
        }, 200);
      } catch (error) {
        // console.error("Error fetching dashboard data:", error);
        showAlert("error", "Failed to fetch dashboard data");
        setDataLoaded(true);
        setIsRefreshing(false);
      }
    },
    [id, showAlert]
  );

  useEffect(() => {
    if (id) {
      fetchDashboardData(false);
    }
  }, [id, fetchDashboardData]);

  const csvInputRef = useRef(null);

  const downloadCSVTemplate = useCallback(() => {
    try {
      const headers = [
        "name",
        "phone_number",
        "email_address",
        "dob",
        "gender",
        "nationality",
        "marital_status",
        "category",
        "secondary_email",
        "secondary_phone_number",
        "emergency_contact_name",
        "emergency_contact_relationship",
        "emergency_contact_phone_number",
        "skills",
        "linkedin_url",
        "street",
        "city",
        "state",
        "country",
        "zipcode",
        "pg_course_name",
        "pg_college_name",
        "pg_university_type",
        "pg_start_date",
        "pg_end_date",
        "ug_course_name",
        "ug_college_name",
        "ug_university_type",
        "ug_start_date",
        "ug_end_date",
        "job_title",
        "company_name",
        "department_type",
        "from_date",
        "to_date",
        "event_name",
        "event_role",
        "event_held_organization",
        "event_location",
        "event_date",
      ];

      const csvContent = headers.join(",");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const fileName = `contacts-import-template-${format(
        new Date(),
        "yyyy-MM-dd"
      )}.csv`;

      saveAs(blob, fileName);
      showAlert("success", "CSV template downloaded!");
    } catch (error) {
      // console.error("Error downloading CSV template:", error);
      showAlert("error", "Failed to download CSV template");
    }
  }, [showAlert]);

  const handleCSVUpload = useCallback(
    async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
        showAlert("error", "Please select a valid CSV file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        showAlert("error", "File size too large. Maximum 10MB allowed.");
        return;
      }

      // Show progress modal
      setImportProgress({
        show: true,
        status: "Uploading CSV file...",
        processed: 0,
        total: 0,
      });

      try {
        const formData = new FormData();
        formData.append("csv_file", file);
        formData.append("created_by", id);

        setImportProgress((prev) => ({
          ...prev,
          status: "Processing contacts...",
        }));

        const response = await api.post("/contact/import-csv", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.data.success) {
          const { totalRows, updatedCount, insertedCount, errorCount } =
            response.data.data;

          setImportProgress((prev) => ({
            ...prev,
            status: "Completed!",
            processed: totalRows,
            total: totalRows,
          }));

          // Close modal after short delay
          setTimeout(() => {
            setImportProgress({
              show: false,
              status: "",
              processed: 0,
              total: 0,
            });
            showAlert(
              "success",
              `CSV Import Complete!\n📊 Total: ${totalRows}\n✅ Added: ${insertedCount}\n⚠️ Updated: ${updatedCount}\n❌ Errors: ${errorCount}`
            );
            fetchDashboardData(true);
          }, 1000);
        } else {
          setImportProgress({
            show: false,
            status: "",
            processed: 0,
            total: 0,
          });
          showAlert("error", `Import failed: ${response.data.message}`);
        }
      } catch (error) {
        // console.error("CSV import error:", error);
        setImportProgress({ show: false, status: "", processed: 0, total: 0 });
        showAlert(
          "error",
          `CSV Import Error: ${error.response?.data?.message || error.message}`
        );
      }

      event.target.value = "";
    },
    [id, showAlert, fetchDashboardData]
  );

  const quickActions = useMemo(
    () => [
      {
        title: "Add New Contact",
        description: "Create verified contact entry",
        icon: Users,
        color: "bg-blue-500",
        onClick: () =>
          navigate("/details-input", {
            state: {
              contact: null,
              isAddMode: true,
              source: "admin",
              currentUserId: id,
              userRole: role,
              successCallback: {
                message: "User has been successfully added to contacts.",
                refreshData: true,
              },
            },
          }),
      },
      {
        title: "Bulk CSV Import",
        description: "Import verified contacts",
        icon: UserCheck,
        color: "bg-orange-500",
        onClick: () => csvInputRef.current?.click(),
      },
      {
        title: "Download CSV Template",
        description: "Get empty CSV template",
        icon: FileText,
        color: "bg-teal-500",
        onClick: downloadCSVTemplate,
      },
      {
        title: "Task Management",
        description: "Create & assign tasks",
        icon: Handshake,
        color: "bg-green-500",
        onClick: () => navigate("/task-assignments"),
      },
      {
        title: "Export Data",
        description: "Download reports",
        icon: Download,
        color: "bg-purple-500",
        onClick: async () => {
          try {
            setIsRefreshing(true);
            const response = await api.get("/contact/get-all-contact/");
            const exportContacts = response.data.data || [];

            if (exportContacts.length === 0) {
              showAlert("warning", "No contacts to export");
              setIsRefreshing(false);
              return;
            }

            // Helper function to safely format dates
            const formatDate = (dateValue) => {
              if (!dateValue) return "";
              try {
                const date =
                  typeof dateValue === "string"
                    ? parseISO(dateValue)
                    : dateValue;
                return format(date, "yyyy-MM-dd");
              } catch (error) {
                return "";
              }
            };

            const headers = [
              "name",
              "phone_number",
              "email_address",
              "dob",
              "gender",
              "nationality",
              "marital_status",
              "category",
              "secondary_email",
              "secondary_phone_number",
              "emergency_contact_name",
              "emergency_contact_relationship",
              "emergency_contact_phone_number",
              "skills",
              "linkedin_url",
              "street",
              "city",
              "state",
              "country",
              "zipcode",
              "pg_course_name",
              "pg_college_name",
              "pg_university_type",
              "pg_start_date",
              "pg_end_date",
              "ug_course_name",
              "ug_college_name",
              "ug_university_type",
              "ug_start_date",
              "ug_end_date",
              "job_title",
              "company_name",
              "department_type",
              "from_date",
              "to_date",
              "event_name",
              "event_role",
              "event_held_organization",
              "event_location",
              "event_date",
            ];

            const csvRows = [];
            csvRows.push(headers.join(","));

            exportContacts.forEach((contact) => {
              // Get events array (could be contact.events or contact.event)
              const events = contact.events || contact.event || [];

              // If contact has events, create one row per event
              if (events.length > 0) {
                events.forEach((event) => {
                  const row = [
                    contact.name || "",
                    contact.phone_number || "",
                    contact.email_address || "",
                    formatDate(contact.dob),
                    contact.gender || "",
                    contact.nationality || "",
                    contact.marital_status || "",
                    contact.category || "",
                    contact.secondary_email || "",
                    contact.secondary_phone_number || "",
                    contact.emergency_contact_name || "",
                    contact.emergency_contact_relationship || "",
                    contact.emergency_contact_phone_number || "",
                    contact.skills || "",
                    contact.linkedin_url || "",
                    contact.street || "",
                    contact.city || "",
                    contact.state || "",
                    contact.country || "",
                    contact.zipcode || "",
                    contact.pg_course_name || "",
                    contact.pg_college_name || contact.pg_college || "",
                    contact.pg_university_type || contact.pg_university || "",
                    formatDate(contact.pg_start_date || contact.pg_from_date),
                    formatDate(contact.pg_end_date || contact.pg_to_date),
                    contact.ug_course_name || "",
                    contact.ug_college_name || contact.ug_college || "",
                    contact.ug_university_type || contact.ug_university || "",
                    formatDate(contact.ug_start_date || contact.ug_from_date),
                    formatDate(contact.ug_end_date || contact.ug_to_date),
                    contact.job_title || "",
                    contact.company_name || contact.company || "",
                    contact.department_type || contact.department || "",
                    formatDate(contact.from_date),
                    formatDate(contact.to_date),
                    event.event_name || "",
                    event.event_role || "",
                    event.event_held_organization || "",
                    event.event_location || "",
                    formatDate(event.event_date),
                  ];

                  csvRows.push(
                    row
                      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
                      .join(",")
                  );
                });
              } else {
                // Contact has no events - create one row with empty event fields
                const row = [
                  contact.name || "",
                  contact.phone_number || "",
                  contact.email_address || "",
                  formatDate(contact.dob),
                  contact.gender || "",
                  contact.nationality || "",
                  contact.marital_status || "",
                  contact.category || "",
                  contact.secondary_email || "",
                  contact.secondary_phone_number || "",
                  contact.emergency_contact_name || "",
                  contact.emergency_contact_relationship || "",
                  contact.emergency_contact_phone_number || "",
                  contact.skills || "",
                  contact.linkedin_url || "",
                  contact.street || "",
                  contact.city || "",
                  contact.state || "",
                  contact.country || "",
                  contact.zipcode || "",
                  contact.pg_course_name || "",
                  contact.pg_college_name || contact.pg_college || "",
                  contact.pg_university_type || contact.pg_university || "",
                  formatDate(contact.pg_start_date || contact.pg_from_date),
                  formatDate(contact.pg_end_date || contact.pg_to_date),
                  contact.ug_course_name || "",
                  contact.ug_college_name || contact.ug_college || "",
                  contact.ug_university_type || contact.ug_university || "",
                  formatDate(contact.ug_start_date || contact.ug_from_date),
                  formatDate(contact.ug_end_date || contact.ug_to_date),
                  contact.job_title || "",
                  contact.company_name || contact.company || "",
                  contact.department_type || contact.department || "",
                  formatDate(contact.from_date),
                  formatDate(contact.to_date),
                  "", // event_name
                  "", // event_role
                  "", // event_held_organization
                  "", // event_location
                  "", // event_date
                ];

                csvRows.push(
                  row
                    .map((field) => `"${String(field).replace(/"/g, '""')}"`)
                    .join(",")
                );
              }
            });

            const csvContent = csvRows.join("\n");

            // Create and download file
            const blob = new Blob([csvContent], {
              type: "text/csv;charset=utf-8;",
            });
            const fileName = `contacts-export-${format(
              new Date(),
              "yyyy-MM-dd-HHmmss"
            )}.csv`;
            saveAs(blob, fileName);

            showAlert("success", `Exported ${exportContacts.length} contacts`);
          } catch (error) {
            // console.error("Export error:", error);
            showAlert("error", "Failed to export contacts");
          } finally {
            setIsRefreshing(false);
          }
        },
      },
    ],
    [navigate, id, role, downloadCSVTemplate, showAlert]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv,application/vnd.ms-excel"
        onChange={handleCSVUpload}
        style={{ display: "none" }}
      />

      {/* Import Progress Notification */}
      {importProgress.show && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-5 max-w-sm w-80">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Importing CSV Data
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {importProgress.status}
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 animate-pulse"
                    style={{ width: "100%" }}
                  ></div>
                </div>

                {importProgress.total > 0 && (
                  <p className="text-xs text-gray-500">
                    {importProgress.processed} / {importProgress.total} rows
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Alert
        isOpen={alert.isOpen}
        severity={alert.severity}
        message={alert.message}
        onClose={closeAlert}
        position="bottom"
        duration={alert.severity === "info" ? 0 : 4000}
      />

      <div className="w-full bg-white shadow-sm sticky top-0 z-50 border-b-2 border-b-gray-50">
        <div className="flex justify-end">
          <Header />
        </div>
      </div>

      <div className="p-6">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                {isRefreshing && (
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                )}
              </div>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Data Analytics • Updated: {format(new Date(), "HH:mm")}
              </p>
            </div>

            <button
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span>{isRefreshing ? "Refreshing..." : "Refresh Data"}</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {!dataLoaded ? (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <StatCardSkeleton key={i} />
                ))}
              </>
            ) : (
              <>
                <StatCard
                  title="Total Contacts"
                  value={stats.totalContacts.toLocaleString()}
                  icon={Users}
                  color="bg-gradient-to-r from-blue-500 to-blue-600"
                  subtext="All registered users"
                />
                <StatCard
                  title="Verified Contacts"
                  value={stats.verifiedContacts.toLocaleString()}
                  icon={UserCheck}
                  color="bg-gradient-to-r from-green-500 to-green-600"
                  subtext={
                    <>
                      <span className="text-green-600 font-semibold">
                        {stats.verifiedContactsTrend}%
                      </span>{" "}
                      of total
                    </>
                  }
                />
                <StatCard
                  title="Data Quality Score"
                  value={`${stats.dataQualityScore}%`}
                  icon={Shield}
                  color="bg-gradient-to-r from-purple-500 to-purple-600"
                  subtext="Complete profiles"
                />
                <StatCard
                  title="Complete Profiles"
                  value={stats.completeProfiles.toLocaleString()}
                  icon={CheckCircle}
                  color="bg-gradient-to-r from-green-600 to-emerald-600"
                  subtext={
                    <>
                      <span className="text-green-600 font-semibold">
                        {stats.completeProfilesTrend}%
                      </span>{" "}
                      completion
                    </>
                  }
                />
                <StatCard
                  title="Total Events"
                  value={stats.totalEvents.toLocaleString()}
                  icon={Calendar}
                  color="bg-gradient-to-r from-purple-600 to-purple-700"
                  subtext="Distinct events"
                />
                <StatCard
                  title="Verification Queue"
                  value={stats.unverifiedContacts.toLocaleString()}
                  icon={AlertTriangle}
                  color="bg-gradient-to-r from-red-500 to-red-600"
                  subtext="Awaiting review"
                />
              </>
            )}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              {!dataLoaded ? (
                <ChartSkeleton />
              ) : (
                <>
                  <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Quick Actions
                      </h2>
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="space-y-3">
                      {quickActions.map((action, index) => (
                        <QuickActionCard key={index} {...action} />
                      ))}
                    </div>
                  </div>
                  <ContactDiversityOverview contacts={contacts} />
                  <div className="mt-9">
                    <OnlineUsersCard />
                  </div>
                </>
              )}
            </div>

            <div className="lg:col-span-2 space-y-8">
              {!dataLoaded ? (
                <>
                  <ChartSkeleton />
                  <ChartSkeleton />
                </>
              ) : (
                <>
                  <Suspense fallback={<ChartSkeleton />}>
                    <ContactSourceAnalytics contacts={sampledContacts} />
                  </Suspense>
                  <RecentEventsTimeline contacts={contacts} />
                </>
              )}
            </div>
          </div>

          {/* 🔥 CHARTS WITH STAGGERED LOADING */}
          <div className="mt-8">
            <LazyChart minHeight="450px">
              <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Contact Activity Over Time
                  </h2>
                </div>
                {!chartsDataReady ? (
                  <ChartSkeleton />
                ) : (
                  <Suspense fallback={<ChartSkeleton />}>
                    <ContactsChart
                      modificationHistory={modificationHistory}
                      startDate={startDate}
                      endDate={endDate}
                      dateRangeType={dateRangeType}
                      setStartDate={setStartDate}
                      setEndDate={setEndDate}
                      setDateRangeType={setDateRangeType}
                    />
                  </Suspense>
                )}
              </div>
            </LazyChart>
          </div>

          <div className="mt-6">
            <LazyChart minHeight="400px">
              {!dataLoaded ? (
                <ChartSkeleton title="Skills Distribution" />
              ) : (
                <Suspense
                  fallback={<ChartSkeleton title="Skills Distribution" />}
                >
                  <SkillsHorizontalBarChart contacts={sampledContacts} />
                </Suspense>
              )}
            </LazyChart>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LazyChart minHeight="350px">
              {!dataLoaded ? (
                <ChartSkeleton title="Events Analysis" />
              ) : (
                <Suspense fallback={<ChartSkeleton title="Events Analysis" />}>
                  <EventsBarChart contacts={sampledContacts} />
                </Suspense>
              )}
            </LazyChart>
            <LazyChart minHeight="350px">
              {!dataLoaded ? (
                <ChartSkeleton title="User Segmentation" />
              ) : (
                <Suspense
                  fallback={<ChartSkeleton title="User Segmentation" />}
                >
                  <UserActivitySegmentation contacts={sampledContacts} />
                </Suspense>
              )}
            </LazyChart>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Admin);
