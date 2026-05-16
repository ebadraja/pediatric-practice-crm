"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Phone,
  Search,
  Clock,
  CheckCircle2,
  PhoneForwarded,
  Info,
  Play,
  FileText,
  MessageSquare,
  HelpCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Smile,
  Meh,
  Frown,
} from "lucide-react";

interface CallLog {
  id: string;
  time: string;
  date: string;
  callerName: string;
  phone: string;
  duration: string;
  intent: "appointment" | "inquiry" | "complaint" | "support";
  outcome: "booked" | "transferred" | "info" | "hung-up";
  sentiment: "positive" | "neutral" | "negative";
  transcript: TranscriptMessage[];
  summary: {
    patientName?: string;
    appointmentDate?: string;
    keyData: string[];
  };
}

interface TranscriptMessage {
  speaker: "bot" | "caller";
  text: string;
  timestamp: string;
}

const callLogs: CallLog[] = [
  {
    id: "1",
    time: "10:23 AM",
    date: "Jan 13, 2026",
    callerName: "Sarah Johnson",
    phone: "(555) 123-4567",
    duration: "3:24",
    intent: "appointment",
    outcome: "booked",
    sentiment: "positive",
    summary: {
      patientName: "Emma Wilson",
      appointmentDate: "Jan 20, 2026 at 2:00 PM",
      keyData: ["Sick visit requested", "Booked with Dr. Tamas"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! Thank you for calling Kids 0-18 Pediatrics. How can I help you today?", timestamp: "10:23 AM" },
      { speaker: "caller", text: "Hi, I need to schedule an appointment for my daughter. She has a cough.", timestamp: "10:23 AM" },
      { speaker: "bot", text: "I'm sorry to hear that. I can help you book an appointment. What is your daughter's name?", timestamp: "10:24 AM" },
      { speaker: "caller", text: "Emma Wilson.", timestamp: "10:24 AM" },
      { speaker: "bot", text: "Thank you, Sarah. Emma is already in our system. What dates work best for you?", timestamp: "10:25 AM" },
      { speaker: "caller", text: "Next Monday or Tuesday would be great.", timestamp: "10:25 AM" },
      { speaker: "bot", text: "Perfect! I have availability on Monday January 20th at 2:00 PM with Dr. Tamas. Does that work?", timestamp: "10:26 AM" },
      { speaker: "caller", text: "Yes, that's perfect. Thank you!", timestamp: "10:26 AM" },
      { speaker: "bot", text: "Great! Your appointment is confirmed. You'll receive a confirmation text. Have a great day!", timestamp: "10:27 AM" },
    ],
  },
  {
    id: "2",
    time: "10:45 AM",
    date: "Jan 13, 2026",
    callerName: "Michael Chen",
    phone: "(555) 234-5678",
    duration: "2:18",
    intent: "appointment",
    outcome: "booked",
    sentiment: "positive",
    summary: {
      patientName: "Lucas Brown",
      appointmentDate: "Jan 19, 2026 at 10:30 AM",
      keyData: ["Annual physical", "Booked with Dr. Richards"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! Thank you for calling. How can I help?", timestamp: "10:45 AM" },
      { speaker: "caller", text: "I need to book an annual physical for my son Lucas.", timestamp: "10:45 AM" },
      { speaker: "bot", text: "I can help with that. Let me find Lucas in our system.", timestamp: "10:46 AM" },
      { speaker: "caller", text: "Okay, thanks.", timestamp: "10:46 AM" },
      { speaker: "bot", text: "I found Lucas. We have availability this Sunday at 10:30 AM. Would that work?", timestamp: "10:46 AM" },
      { speaker: "caller", text: "Perfect!", timestamp: "10:47 AM" },
      { speaker: "bot", text: "Excellent! Annual physical scheduled. Confirmation sent.", timestamp: "10:47 AM" },
    ],
  },
  {
    id: "3",
    time: "11:02 AM",
    date: "Jan 13, 2026",
    callerName: "Unknown Caller",
    phone: "(555) 345-6789",
    duration: "4:51",
    intent: "inquiry",
    outcome: "transferred",
    sentiment: "neutral",
    summary: {
      keyData: ["General practice questions", "Transferred to staff for further assistance"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! Thank you for calling Kids 0-18 Pediatrics.", timestamp: "11:02 AM" },
      { speaker: "caller", text: "Hi, I'm calling on behalf of my organization. Do you accept insurance from Blue Cross?", timestamp: "11:02 AM" },
      { speaker: "bot", text: "That's a great question. Let me transfer you to our billing department for detailed information.", timestamp: "11:03 AM" },
      { speaker: "caller", text: "Okay, thank you.", timestamp: "11:03 AM" },
      { speaker: "bot", text: "One moment while I get someone on the line for you.", timestamp: "11:04 AM" },
      { speaker: "caller", text: "Sure, I'll wait.", timestamp: "11:04 AM" },
      { speaker: "bot", text: "Thank you for your patience. Connecting you now.", timestamp: "11:06 AM" },
    ],
  },
  {
    id: "4",
    time: "11:30 AM",
    date: "Jan 13, 2026",
    callerName: "Jennifer Davis",
    phone: "(555) 456-7890",
    duration: "1:47",
    intent: "appointment",
    outcome: "booked",
    sentiment: "positive",
    summary: {
      patientName: "Olivia Davis",
      appointmentDate: "Jan 22, 2026 at 11:00 AM",
      keyData: ["Vaccination follow-up", "Booked with Nurse Jennifer"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! How can I help you today?", timestamp: "11:30 AM" },
      { speaker: "caller", text: "I'd like to schedule a follow-up vaccine appointment for my daughter.", timestamp: "11:30 AM" },
      { speaker: "bot", text: "Of course. Which daughter would this be for?", timestamp: "11:31 AM" },
      { speaker: "caller", text: "Olivia.", timestamp: "11:31 AM" },
      { speaker: "bot", text: "Perfect. I have January 22nd at 11:00 AM available. Does that work?", timestamp: "11:31 AM" },
      { speaker: "caller", text: "Yes, perfect!", timestamp: "11:32 AM" },
      { speaker: "bot", text: "Great! Confirmed. Thank you for calling.", timestamp: "11:32 AM" },
    ],
  },
  {
    id: "5",
    time: "12:15 PM",
    date: "Jan 13, 2026",
    callerName: "David Patel",
    phone: "(555) 567-8901",
    duration: "2:33",
    intent: "appointment",
    outcome: "booked",
    sentiment: "positive",
    summary: {
      patientName: "Aditya Patel",
      appointmentDate: "Jan 21, 2026 at 3:30 PM",
      keyData: ["School physical", "Booked with Dr. Tamas"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! Thank you for calling.", timestamp: "12:15 PM" },
      { speaker: "caller", text: "Hi, my son needs a school physical before the semester starts.", timestamp: "12:15 PM" },
      { speaker: "bot", text: "I can help with that. What's your son's name?", timestamp: "12:15 PM" },
      { speaker: "caller", text: "Aditya Patel.", timestamp: "12:16 PM" },
      { speaker: "bot", text: "Found him! I have availability on Tuesday at 3:30 PM. Good?", timestamp: "12:16 PM" },
      { speaker: "caller", text: "That works great.", timestamp: "12:17 PM" },
      { speaker: "bot", text: "Perfect! School physical scheduled. Have a great day!", timestamp: "12:17 AM" },
    ],
  },
  {
    id: "6",
    time: "1:30 PM",
    date: "Jan 13, 2026",
    callerName: "Emily Rodriguez",
    phone: "(555) 678-9012",
    duration: "3:05",
    intent: "inquiry",
    outcome: "info",
    sentiment: "neutral",
    summary: {
      keyData: ["Questions about vaccination schedule", "Information provided"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! How can I assist you?", timestamp: "1:30 PM" },
      { speaker: "caller", text: "Hi, I have some questions about the recommended vaccination schedule for kids.", timestamp: "1:30 PM" },
      { speaker: "bot", text: "That's an important topic. What specific questions do you have?", timestamp: "1:31 PM" },
      { speaker: "caller", text: "What vaccinations are recommended at age 4?", timestamp: "1:31 PM" },
      { speaker: "bot", text: "At age 4, we typically recommend booster shots for diphtheria, tetanus, and other vaccines. Our doctors can provide complete details.", timestamp: "1:32 PM" },
      { speaker: "caller", text: "That's helpful, thanks.", timestamp: "1:33 PM" },
      { speaker: "bot", text: "You're welcome. Is there anything else I can help with?", timestamp: "1:33 PM" },
      { speaker: "caller", text: "No, that's all. Thank you!", timestamp: "1:34 PM" },
    ],
  },
  {
    id: "7",
    time: "2:15 PM",
    date: "Jan 13, 2026",
    callerName: "Robert Taylor",
    phone: "(555) 789-0123",
    duration: "1:23",
    intent: "appointment",
    outcome: "booked",
    sentiment: "positive",
    summary: {
      patientName: "Sophie Taylor",
      appointmentDate: "Jan 23, 2026 at 9:00 AM",
      keyData: ["Well-child checkup", "Booked with Dr. Richards"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! How can I help?", timestamp: "2:15 PM" },
      { speaker: "caller", text: "I need to schedule a checkup for my daughter Sophie.", timestamp: "2:15 PM" },
      { speaker: "bot", text: "I can help with that. What day works best?", timestamp: "2:16 PM" },
      { speaker: "caller", text: "Thursday morning would be great.", timestamp: "2:16 PM" },
      { speaker: "bot", text: "Perfect! I have Thursday at 9:00 AM. Booking that now.", timestamp: "2:16 PM" },
      { speaker: "caller", text: "Thanks!", timestamp: "2:17 PM" },
      { speaker: "bot", text: "All set! Thank you for calling.", timestamp: "2:17 PM" },
    ],
  },
  {
    id: "8",
    time: "2:45 PM",
    date: "Jan 13, 2026",
    callerName: "Margaret Walsh",
    phone: "(555) 890-1234",
    duration: "5:42",
    intent: "complaint",
    outcome: "transferred",
    sentiment: "negative",
    summary: {
      keyData: ["Billing issue", "Transferred to manager for resolution"],
    },
    transcript: [
      { speaker: "bot", text: "Thank you for calling. How can I help?", timestamp: "2:45 PM" },
      { speaker: "caller", text: "I'm calling to complain about a billing error on my account.", timestamp: "2:45 PM" },
      { speaker: "bot", text: "I'm sorry you're experiencing billing issues. This is important.", timestamp: "2:46 PM" },
      { speaker: "caller", text: "Yes, I was charged twice for my son's visit last month.", timestamp: "2:46 PM" },
      { speaker: "bot", text: "That's definitely frustrating. I'm going to connect you with our billing manager who can resolve this.", timestamp: "2:47 PM" },
      { speaker: "caller", text: "Thank you, I appreciate it.", timestamp: "2:48 PM" },
      { speaker: "bot", text: "One moment please.", timestamp: "2:50 PM" },
      { speaker: "caller", text: "Okay.", timestamp: "2:50 PM" },
      { speaker: "bot", text: "Connecting you now. Thank you for your patience.", timestamp: "2:50 PM" },
    ],
  },
  {
    id: "9",
    time: "3:20 PM",
    date: "Jan 13, 2026",
    callerName: "Christopher Jones",
    phone: "(555) 901-2345",
    duration: "2:11",
    intent: "appointment",
    outcome: "booked",
    sentiment: "positive",
    summary: {
      patientName: "Grace Jones",
      appointmentDate: "Jan 24, 2026 at 2:00 PM",
      keyData: ["Sick visit - ear pain", "Booked with Dr. Tamas"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! Thank you for calling.", timestamp: "3:20 PM" },
      { speaker: "caller", text: "Hi, my daughter has been complaining about ear pain. I need to get her in quickly.", timestamp: "3:20 PM" },
      { speaker: "bot", text: "I understand. Let me find availability for you. What's your daughter's name?", timestamp: "3:21 PM" },
      { speaker: "caller", text: "Grace Jones.", timestamp: "3:21 PM" },
      { speaker: "bot", text: "I have Grace in the system. I can get her in tomorrow at 2:00 PM with Dr. Tamas. Would that work?", timestamp: "3:22 PM" },
      { speaker: "caller", text: "Tomorrow? That's perfect!", timestamp: "3:22 PM" },
      { speaker: "bot", text: "Excellent! All set. Please bring her insurance card.", timestamp: "3:22 PM" },
      { speaker: "caller", text: "Will do. Thanks!", timestamp: "3:23 PM" },
    ],
  },
  {
    id: "10",
    time: "3:45 PM",
    date: "Jan 13, 2026",
    callerName: "Lisa Anderson",
    phone: "(555) 012-3456",
    duration: "3:34",
    intent: "support",
    outcome: "info",
    sentiment: "positive",
    summary: {
      keyData: ["Questions about office hours", "Information provided"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! How can I help you today?", timestamp: "3:45 PM" },
      { speaker: "caller", text: "Hi, what are your office hours for weekends?", timestamp: "3:45 PM" },
      { speaker: "bot", text: "Great question. We're open on Saturdays from 9:00 AM to 2:00 PM, and closed on Sundays.", timestamp: "3:46 PM" },
      { speaker: "caller", text: "Perfect. One more thing - do you offer after-hours appointments?", timestamp: "3:46 PM" },
      { speaker: "bot", text: "We have limited after-hours availability. That's something you can ask about when scheduling.", timestamp: "3:47 PM" },
      { speaker: "caller", text: "Thanks so much!", timestamp: "3:48 PM" },
      { speaker: "bot", text: "You're welcome! Is there anything else?", timestamp: "3:48 PM" },
      { speaker: "caller", text: "No, that was all. Have a good day!", timestamp: "3:48 PM" },
      { speaker: "bot", text: "You too! Thank you for calling.", timestamp: "3:49 PM" },
    ],
  },
  {
    id: "11",
    time: "4:10 PM",
    date: "Jan 13, 2026",
    callerName: "Unknown Caller",
    phone: "(555) 123-7890",
    duration: "0:45",
    intent: "appointment",
    outcome: "hung-up",
    sentiment: "neutral",
    summary: {
      keyData: ["Call dropped", "No appointment booked"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! Thank you for calling Kids 0-18 Pediatrics.", timestamp: "4:10 PM" },
      { speaker: "caller", text: "Hi, I need to—", timestamp: "4:10 PM" },
      { speaker: "bot", text: "[Call disconnected]", timestamp: "4:11 PM" },
    ],
  },
  {
    id: "12",
    time: "4:30 PM",
    date: "Jan 13, 2026",
    callerName: "Thomas Martinez",
    phone: "(555) 234-7890",
    duration: "2:56",
    intent: "appointment",
    outcome: "booked",
    sentiment: "positive",
    summary: {
      patientName: "Carlos Martinez",
      appointmentDate: "Jan 25, 2026 at 10:00 AM",
      keyData: ["Vaccination", "Booked with Nurse Jennifer"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! How can I help you?", timestamp: "4:30 PM" },
      { speaker: "caller", text: "I need to schedule a vaccination appointment for my son.", timestamp: "4:30 PM" },
      { speaker: "bot", text: "I can help with that. What's your son's name?", timestamp: "4:31 PM" },
      { speaker: "caller", text: "Carlos.", timestamp: "4:31 PM" },
      { speaker: "bot", text: "Found Carlos in our system. We have Saturday at 10:00 AM available. Does that work?", timestamp: "4:31 PM" },
      { speaker: "caller", text: "Saturday is perfect!", timestamp: "4:32 PM" },
      { speaker: "bot", text: "Great! Carlos's vaccination is scheduled. See you Saturday!", timestamp: "4:32 PM" },
      { speaker: "caller", text: "Thanks!", timestamp: "4:33 PM" },
    ],
  },
  {
    id: "13",
    time: "5:00 PM",
    date: "Jan 13, 2026",
    callerName: "Victoria Lee",
    phone: "(555) 345-7890",
    duration: "3:18",
    intent: "inquiry",
    outcome: "info",
    sentiment: "neutral",
    summary: {
      keyData: ["Insurance and payment questions", "Information provided"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! Thank you for calling.", timestamp: "5:00 PM" },
      { speaker: "caller", text: "Hi, I wanted to know if you accept our insurance plan.", timestamp: "5:00 PM" },
      { speaker: "bot", text: "I'd be happy to help with that. What insurance do you have?", timestamp: "5:01 PM" },
      { speaker: "caller", text: "Blue Shield PPO.", timestamp: "5:01 PM" },
      { speaker: "bot", text: "Yes, we do accept Blue Shield PPO. You can also visit our website for a full list of accepted plans.", timestamp: "5:02 PM" },
      { speaker: "caller", text: "Perfect! Thank you.", timestamp: "5:03 PM" },
      { speaker: "bot", text: "Is there anything else I can help with?", timestamp: "5:03 PM" },
      { speaker: "caller", text: "No, that's all. Thanks!", timestamp: "5:03 PM" },
      { speaker: "bot", text: "You're welcome! Goodbye!", timestamp: "5:04 PM" },
    ],
  },
  {
    id: "14",
    time: "5:25 PM",
    date: "Jan 13, 2026",
    callerName: "Kevin White",
    phone: "(555) 456-7890",
    duration: "2:45",
    intent: "appointment",
    outcome: "booked",
    sentiment: "positive",
    summary: {
      patientName: "Ethan White",
      appointmentDate: "Jan 26, 2026 at 11:30 AM",
      keyData: ["Sick visit - cold", "Booked with Dr. Richards"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! How can I help you?", timestamp: "5:25 PM" },
      { speaker: "caller", text: "My son has a cold and I'd like to bring him in.", timestamp: "5:25 PM" },
      { speaker: "bot", text: "I can help schedule that. What's his name?", timestamp: "5:26 PM" },
      { speaker: "caller", text: "Ethan White.", timestamp: "5:26 PM" },
      { speaker: "bot", text: "Found him. We have Sunday at 11:30 AM available. Good?", timestamp: "5:26 PM" },
      { speaker: "caller", text: "Yes, that works.", timestamp: "5:27 PM" },
      { speaker: "bot", text: "Perfect! Ethan's appointment is booked. See you Sunday!", timestamp: "5:27 PM" },
      { speaker: "caller", text: "Thanks!", timestamp: "5:28 PM" },
    ],
  },
  {
    id: "15",
    time: "5:50 PM",
    date: "Jan 13, 2026",
    callerName: "Patricia Brown",
    phone: "(555) 567-7890",
    duration: "2:12",
    intent: "appointment",
    outcome: "booked",
    sentiment: "positive",
    summary: {
      patientName: "Ava Brown",
      appointmentDate: "Jan 27, 2026 at 1:00 PM",
      keyData: ["Annual physical", "Booked with Dr. Tamas"],
    },
    transcript: [
      { speaker: "bot", text: "Hello! Thank you for calling.", timestamp: "5:50 PM" },
      { speaker: "caller", text: "Hi, I need to schedule my daughter's annual physical.", timestamp: "5:50 PM" },
      { speaker: "bot", text: "I can help with that. Who is this for?", timestamp: "5:51 PM" },
      { speaker: "caller", text: "Ava Brown.", timestamp: "5:51 PM" },
      { speaker: "bot", text: "Perfect. I have Monday at 1:00 PM. Does that work?", timestamp: "5:51 PM" },
      { speaker: "caller", text: "Yes, perfect!", timestamp: "5:52 PM" },
      { speaker: "bot", text: "Great! All set. See you Monday!", timestamp: "5:52 PM" },
    ],
  },
];

const getSentimentIcon = (sentiment: string) => {
  switch (sentiment) {
    case "positive":
      return <Smile className="w-5 h-5 text-green-600" aria-label="Positive sentiment" />;
    case "neutral":
      return <Meh className="w-5 h-5 text-slate-600" aria-label="Neutral sentiment" />;
    case "negative":
      return <Frown className="w-5 h-5 text-red-600" aria-label="Negative sentiment" />;
    default:
      return null;
  }
};

const getOutcomeColor = (outcome: string) => {
  switch (outcome) {
    case "booked":
      return "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950/50";
    case "transferred":
      return "bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-950/50";
    case "info":
      return "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50";
    case "hung-up":
      return "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50";
    default:
      return "";
  }
};

const getOutcomeLabel = (outcome: string) => {
  switch (outcome) {
    case "booked":
      return "Booked";
    case "transferred":
      return "Transferred";
    case "info":
      return "Info Only";
    case "hung-up":
      return "Hung Up";
    default:
      return outcome;
  }
};

const getIntentIcon = (intent: string) => {
  switch (intent) {
    case "appointment":
      return <Calendar className="h-3 w-3" />;
    case "inquiry":
      return <HelpCircle className="h-3 w-3" />;
    case "complaint":
      return <AlertCircle className="h-3 w-3" />;
    case "support":
      return <MessageSquare className="h-3 w-3" />;
    default:
      return null;
  }
};

const getIntentLabel = (intent: string) => {
  return intent.charAt(0).toUpperCase() + intent.slice(1);
};

export default function CallLogsPage() {
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [filterIntent, setFilterIntent] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCalls = callLogs.filter((call) => {
    const matchesSearch =
      call.callerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.phone.includes(searchTerm) ||
      call.transcript.some((msg) =>
        msg.text.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesOutcome = filterOutcome === "all" || call.outcome === filterOutcome;
    const matchesIntent = filterIntent === "all" || call.intent === filterIntent;

    return matchesSearch && matchesOutcome && matchesIntent;
  });

  const totalCalls = 247;
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredCalls.length);
  const displayedCalls = filteredCalls.slice(startIndex, endIndex);

  const stats = [
    {
      label: "Total Calls Today",
      value: "23",
      icon: Phone,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Successful Bookings",
      value: "18",
      subtitle: "78%",
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Escalated to Staff",
      value: "5",
      subtitle: "22%",
      icon: PhoneForwarded,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      label: "Avg Duration",
      value: "2.4 min",
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="pt-4 pb-8 space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">Call Logs</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Review all calls handled by the AI voice agent</p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white h-9 md:h-10 text-sm self-start sm:self-auto">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-2">{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`${stat.bgColor} dark:bg-opacity-20 p-3 rounded-lg`}>
                    <Icon className={`${stat.color} h-5 w-5`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by caller name, phone, or transcript content..."
            className="pl-10 h-10"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Dropdown Filters & Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          {/* Outcome Filter */}
          <div className="flex gap-0.5 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
            {["all", "booked", "transferred", "info", "hung-up"].map((outcome) => (
              <button
                key={outcome}
                onClick={() => {
                  setFilterOutcome(outcome);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  filterOutcome === outcome
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700"
                }`}
              >
                {outcome === "all" ? "All Outcomes" : getOutcomeLabel(outcome)}
              </button>
            ))}
          </div>

          {/* Intent Filter */}
          <div className="flex gap-0.5 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
            {["all", "appointment", "inquiry", "complaint", "support"].map((intent) => (
              <button
                key={intent}
                onClick={() => {
                  setFilterIntent(intent);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  filterIntent === intent
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700"
                }`}
              >
                {intent === "all" ? "All Intents" : getIntentLabel(intent)}
              </button>
            ))}
          </div>

          {/* Quick Filters */}
          <div className="flex gap-0.5 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
            {["Today", "This Week", "This Month"].map((period) => (
              <button
                key={period}
                className="px-3 py-1 rounded text-xs font-medium transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700"
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>
            Showing {startIndex + 1}-{endIndex} of {totalCalls} total calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Time</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Caller</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Duration</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Intent</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Outcome</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider text-center">Sentiment</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedCalls.map((call) => (
                  <TableRow key={call.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{call.time}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{call.date}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                          {call.callerName === "Unknown Caller"
                            ? "?"
                            : call.callerName.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{call.callerName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{call.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-900 dark:text-slate-100">{call.duration}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                      >
                        {getIntentIcon(call.intent)}
                        {getIntentLabel(call.intent)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getOutcomeColor(call.outcome)}>
                        {getOutcomeLabel(call.outcome)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {getSentimentIcon(call.sentiment)}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
                      >
                        View Transcript
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing {startIndex + 1}-{endIndex} of {totalCalls} calls
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcript Dialog */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center p-0 md:p-4">
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-2xl md:rounded-2xl h-[92vh] md:h-auto md:max-h-[90vh] overflow-y-auto rounded-t-2xl">
            {/* Close Button */}
            <div className="sticky top-0 p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-sm">{selectedCall.callerName}</h3>
              <button
                onClick={() => setSelectedCall(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 md:p-8 space-y-5 md:space-y-6">
              {/* Header */}
              <div className="border-b border-slate-200 pb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {selectedCall.callerName}
                    </h2>
                    <p className="text-slate-600">{selectedCall.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">{selectedCall.date}</p>
                    <p className="text-sm text-slate-600">{selectedCall.time}</p>
                    <p className="text-sm font-medium text-slate-900 mt-1">
                      Duration: {selectedCall.duration}
                    </p>
                  </div>
                </div>
              </div>

              {/* Audio Player */}
              <div className="bg-slate-100 rounded-lg p-6 flex items-center gap-4">
                <button className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <Play className="h-5 w-5 text-white fill-white" />
                </button>
                <div className="flex-1">
                  <div className="bg-slate-300 h-2 rounded-full mb-2" />
                  <p className="text-xs text-slate-600">Call recording</p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 font-medium mb-1">Intent</p>
                    <Badge className="gap-1 bg-slate-100 text-slate-700">
                      {getIntentIcon(selectedCall.intent)}
                      {getIntentLabel(selectedCall.intent)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-medium mb-1">Outcome</p>
                    <Badge className={getOutcomeColor(selectedCall.outcome)}>
                      {getOutcomeLabel(selectedCall.outcome)}
                    </Badge>
                  </div>
                  {selectedCall.summary.patientName && (
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Patient</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedCall.summary.patientName}
                      </p>
                    </div>
                  )}
                  {selectedCall.summary.appointmentDate && (
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Appointment</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedCall.summary.appointmentDate}
                      </p>
                    </div>
                  )}
                </div>
                {selectedCall.summary.keyData.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-xs text-slate-600 font-medium mb-2">Key Information</p>
                    <ul className="space-y-1">
                      {selectedCall.summary.keyData.map((data, idx) => (
                        <li key={idx} className="text-sm text-slate-700">
                          • {data}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900">Transcript</h3>
                <div className="space-y-4">
                  {selectedCall.transcript.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.speaker === "bot" ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-md px-4 py-3 rounded-lg ${
                          msg.speaker === "bot"
                            ? "bg-blue-100 text-slate-900 rounded-bl-none"
                            : "bg-slate-200 text-slate-900 rounded-br-none"
                        }`}
                      >
                        {msg.speaker === "bot" && (
                          <p className="text-xs font-bold text-blue-700 mb-1">Jenny (AI)</p>
                        )}
                        <p className="text-sm">{msg.text}</p>
                        <p className="text-xs text-slate-600 mt-1 opacity-75">
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-200 pt-6 flex gap-3 sticky bottom-0 bg-white">
                <Button variant="outline" className="flex-1 gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Add Note
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Reviewed
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Flag for Follow-up
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
