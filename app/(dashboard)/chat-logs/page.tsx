'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Calendar,
  Clock,
  Phone,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface ChatMessage {
  type: 'bot' | 'visitor' | 'system';
  content: string;
  timestamp: string;
  senderName?: string;
}

interface PatientInfo {
  name: string;
  parentName: string;
  phone: string;
  preferredTime: string;
}

interface ChatLog {
  id: string;
  visitorName: string;
  source: 'Homepage' | 'Booking Page' | 'Contact Page';
  messageCount: number;
  duration: string;
  topic: 'Appointment' | 'Pricing' | 'Insurance' | 'Hours' | 'Services' | 'Other';
  outcome: 'Booked' | 'Info Provided' | 'Escalated' | 'Abandoned';
  startTime: string;
  date: string;
  device: string;
  messages: ChatMessage[];
  pagesVisited: string[];
  patientInfo?: PatientInfo;
}

const SAMPLE_CHATS: ChatLog[] = [
  {
    id: 'chat_001',
    visitorName: 'Jennifer Martinez',
    source: 'Booking Page',
    messageCount: 12,
    duration: '5:32',
    topic: 'Appointment',
    outcome: 'Booked',
    startTime: '10:23 AM',
    date: 'Jan 13, 2026',
    device: 'Mobile - Safari',
    pagesVisited: ['Homepage', 'Services', 'Booking Page'],
    patientInfo: {
      name: 'Lucas Martinez',
      parentName: 'Jennifer Martinez',
      phone: '(555) 234-5678',
      preferredTime: 'Jan 20, 2026 at 2:00 PM',
    },
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Hello! Welcome to Kids 0-18 Pediatrics. How can I help you today?', timestamp: '10:23 AM' },
      { type: 'visitor', content: 'Hi! I need to schedule a sick visit for my son.', timestamp: '10:23 AM' },
      { type: 'bot', senderName: 'Bot', content: "I'd be happy to help! What's your son's name?", timestamp: '10:24 AM' },
      { type: 'visitor', content: 'His name is Lucas. He has a fever and sore throat.', timestamp: '10:24 AM' },
      { type: 'bot', senderName: 'Bot', content: "I'm sorry to hear that. When would you like to bring him in?", timestamp: '10:25 AM' },
      { type: 'visitor', content: 'Next week if possible. Maybe Monday or Tuesday?', timestamp: '10:25 AM' },
      { type: 'bot', senderName: 'Bot', content: 'Great! We have availability Monday January 20th at 2:00 PM with Dr. Tamas. Does that work?', timestamp: '10:26 AM' },
      { type: 'visitor', content: 'Perfect! Yes, that works.', timestamp: '10:26 AM' },
      { type: 'system', content: 'Visitor clicked book appointment button', timestamp: '10:27 AM' },
      { type: 'bot', senderName: 'Bot', content: "Wonderful! Your appointment is confirmed. You'll receive a confirmation email and text.", timestamp: '10:27 AM' },
      { type: 'visitor', content: 'Thank you so much!', timestamp: '10:28 AM' },
      { type: 'bot', senderName: 'Bot', content: "You're welcome! Have a great day!", timestamp: '10:28 AM' },
    ],
  },
  {
    id: 'chat_002',
    visitorName: 'Anonymous Visitor #847',
    source: 'Homepage',
    messageCount: 8,
    duration: '3:15',
    topic: 'Pricing',
    outcome: 'Info Provided',
    startTime: '11:05 AM',
    date: 'Jan 13, 2026',
    device: 'Desktop - Chrome',
    pagesVisited: ['Homepage'],
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Hi there! Have any questions about our services?', timestamp: '11:05 AM' },
      { type: 'visitor', content: 'Do you accept Aetna insurance?', timestamp: '11:05 AM' },
      { type: 'bot', senderName: 'Bot', content: 'Yes, we accept Aetna and many other major insurance plans. Would you like a full list?', timestamp: '11:06 AM' },
      { type: 'visitor', content: 'That would be helpful, thanks.', timestamp: '11:06 AM' },
      { type: 'system', content: 'Visitor requested insurance list', timestamp: '11:07 AM' },
      { type: 'bot', senderName: 'Bot', content: "I've sent you our accepted insurance list. Is there anything else I can help with?", timestamp: '11:07 AM' },
      { type: 'visitor', content: "Nope, that's all. Thanks!", timestamp: '11:08 AM' },
      { type: 'bot', senderName: 'Bot', content: "You're welcome! Feel free to contact us anytime.", timestamp: '11:08 AM' },
    ],
  },
  {
    id: 'chat_003',
    visitorName: 'David Chen',
    source: 'Contact Page',
    messageCount: 15,
    duration: '8:45',
    topic: 'Appointment',
    outcome: 'Booked',
    startTime: '1:32 PM',
    date: 'Jan 13, 2026',
    device: 'Mobile - Chrome',
    pagesVisited: ['Homepage', 'Services', 'Contact Page'],
    patientInfo: { name: 'Sophie Chen', parentName: 'David Chen', phone: '(555) 345-6789', preferredTime: 'Jan 22, 2026 at 10:00 AM' },
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Welcome! How can I help you schedule an appointment?', timestamp: '1:32 PM' },
      { type: 'visitor', content: 'Hi, I need a well-child visit for my daughter Sophie.', timestamp: '1:32 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Great! How old is Sophie?', timestamp: '1:33 PM' },
      { type: 'visitor', content: "She's 6 years old.", timestamp: '1:33 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Perfect. When would be a good time for her appointment?', timestamp: '1:34 PM' },
      { type: 'visitor', content: 'Next week would be ideal. Morning is better for us.', timestamp: '1:34 PM' },
      { type: 'bot', senderName: 'Bot', content: 'I have several morning slots available. How about Wednesday January 22nd at 10:00 AM with Dr. Patel?', timestamp: '1:35 PM' },
      { type: 'visitor', content: 'That works perfectly!', timestamp: '1:35 PM' },
      { type: 'system', content: 'Visitor provided contact information', timestamp: '1:36 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Excellent! Can I get your phone number for the appointment?', timestamp: '1:36 PM' },
      { type: 'visitor', content: '(555) 345-6789', timestamp: '1:37 PM' },
      { type: 'system', content: 'Form submitted', timestamp: '1:37 AM' },
      { type: 'bot', senderName: 'Bot', content: "Perfect! Your appointment is confirmed. You'll receive a confirmation message.", timestamp: '1:38 PM' },
      { type: 'visitor', content: 'Thank you so much for your help!', timestamp: '1:38 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Happy to help! See you soon.', timestamp: '1:39 PM' },
    ],
  },
  {
    id: 'chat_004',
    visitorName: 'Anonymous Visitor #523',
    source: 'Homepage',
    messageCount: 4,
    duration: '1:20',
    topic: 'Hours',
    outcome: 'Abandoned',
    startTime: '2:15 PM',
    date: 'Jan 13, 2026',
    device: 'Mobile - Firefox',
    pagesVisited: ['Homepage'],
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Hello! What can I help you with today?', timestamp: '2:15 PM' },
      { type: 'visitor', content: 'What are your weekend hours?', timestamp: '2:15 PM' },
      { type: 'bot', senderName: 'Bot', content: "We're open Saturday 9 AM - 2 PM and closed Sunday. Is there anything else?", timestamp: '2:16 PM' },
      { type: 'system', content: 'Chat ended by visitor', timestamp: '2:16 PM' },
    ],
  },
  {
    id: 'chat_005',
    visitorName: 'Michelle Wong',
    source: 'Booking Page',
    messageCount: 10,
    duration: '6:22',
    topic: 'Appointment',
    outcome: 'Booked',
    startTime: '3:45 PM',
    date: 'Jan 13, 2026',
    device: 'Desktop - Safari',
    pagesVisited: ['Homepage', 'Services', 'Booking Page'],
    patientInfo: { name: 'Lily Wong', parentName: 'Michelle Wong', phone: '(555) 456-7890', preferredTime: 'Jan 23, 2026 at 3:30 PM' },
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Hi! Welcome. Looking to schedule an appointment?', timestamp: '3:45 PM' },
      { type: 'visitor', content: 'Yes, my daughter needs a vaccination update.', timestamp: '3:45 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Great! How old is your daughter?', timestamp: '3:46 PM' },
      { type: 'visitor', content: "She'll be 5 next month.", timestamp: '3:46 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Perfect. When would you like to bring her in for her vaccines?', timestamp: '3:47 PM' },
      { type: 'visitor', content: 'Next Thursday or Friday afternoon?', timestamp: '3:47 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Excellent! We have Thursday January 23rd at 3:30 PM available. Would that work?', timestamp: '3:48 PM' },
      { type: 'visitor', content: 'Perfect! Book it!', timestamp: '3:48 PM' },
      { type: 'system', content: 'Visitor clicked book appointment button', timestamp: '3:49 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Your appointment is confirmed! See you Thursday!', timestamp: '3:50 PM' },
    ],
  },
  {
    id: 'chat_006',
    visitorName: 'Robert Johnson',
    source: 'Homepage',
    messageCount: 9,
    duration: '4:18',
    topic: 'Insurance',
    outcome: 'Info Provided',
    startTime: '4:20 PM',
    date: 'Jan 13, 2026',
    device: 'Desktop - Chrome',
    pagesVisited: ['Homepage', 'Services'],
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Hi there! How can we help?', timestamp: '4:20 PM' },
      { type: 'visitor', content: "Do you accept United Healthcare? And what's the cost without insurance?", timestamp: '4:20 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Yes, we accept United Healthcare. For uninsured patients, a well-child visit is typically $150-200.', timestamp: '4:21 PM' },
      { type: 'visitor', content: 'What about sick visits?', timestamp: '4:22 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Sick visits are usually $120-150, depending on complexity.', timestamp: '4:22 PM' },
      { type: 'visitor', content: 'Okay, and do you offer a payment plan?', timestamp: '4:23 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Yes, we offer flexible payment plans for uninsured patients. You can discuss details when you call our office.', timestamp: '4:23 PM' },
      { type: 'visitor', content: 'Thanks for the info!', timestamp: '4:24 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Happy to help! Feel free to call us anytime.', timestamp: '4:24 PM' },
    ],
  },
  {
    id: 'chat_007',
    visitorName: 'Anonymous Visitor #612',
    source: 'Contact Page',
    messageCount: 6,
    duration: '2:50',
    topic: 'Services',
    outcome: 'Info Provided',
    startTime: '5:12 PM',
    date: 'Jan 13, 2026',
    device: 'Mobile - Chrome',
    pagesVisited: ['Services', 'Contact Page'],
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Welcome! What services are you interested in?', timestamp: '5:12 PM' },
      { type: 'visitor', content: 'Do you offer school physicals?', timestamp: '5:12 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Yes, we offer school physicals! We complete them quickly and thoroughly.', timestamp: '5:13 PM' },
      { type: 'visitor', content: 'Great! How much do they cost?', timestamp: '5:13 PM' },
      { type: 'bot', senderName: 'Bot', content: 'School physicals are usually covered by insurance or $100 if uninsured.', timestamp: '5:14 PM' },
      { type: 'visitor', content: 'Thanks!', timestamp: '5:14 PM' },
    ],
  },
  {
    id: 'chat_008',
    visitorName: 'Karen Rodriguez',
    source: 'Booking Page',
    messageCount: 11,
    duration: '7:05',
    topic: 'Appointment',
    outcome: 'Booked',
    startTime: '9:35 AM',
    date: 'Jan 12, 2026',
    device: 'Mobile - Safari',
    pagesVisited: ['Homepage', 'Services', 'Booking Page'],
    patientInfo: { name: 'Diego Rodriguez', parentName: 'Karen Rodriguez', phone: '(555) 567-8901', preferredTime: 'Jan 19, 2026 at 11:00 AM' },
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Hello! Need to schedule an appointment?', timestamp: '9:35 AM' },
      { type: 'visitor', content: 'Yes, my son has an ear infection.', timestamp: '9:35 AM' },
      { type: 'bot', senderName: 'Bot', content: "I'm sorry to hear that. Can he be seen soon?", timestamp: '9:36 AM' },
      { type: 'visitor', content: 'As soon as possible would be great.', timestamp: '9:36 AM' },
      { type: 'bot', senderName: 'Bot', content: 'We have availability this Sunday at 11 AM. Would that work?', timestamp: '9:37 AM' },
      { type: 'visitor', content: 'Perfect!', timestamp: '9:37 AM' },
      { type: 'system', content: 'Visitor clicked book appointment button', timestamp: '9:38 AM' },
      { type: 'bot', senderName: 'Bot', content: "What's the best phone number to reach you?", timestamp: '9:38 AM' },
      { type: 'visitor', content: '(555) 567-8901', timestamp: '9:39 AM' },
      { type: 'system', content: 'Form submitted', timestamp: '9:39 AM' },
      { type: 'bot', senderName: 'Bot', content: 'Great! Your appointment is confirmed for Sunday at 11 AM.', timestamp: '9:40 AM' },
    ],
  },
  {
    id: 'chat_009',
    visitorName: 'Anonymous Visitor #734',
    source: 'Homepage',
    messageCount: 3,
    duration: '0:45',
    topic: 'Other',
    outcome: 'Abandoned',
    startTime: '2:05 PM',
    date: 'Jan 12, 2026',
    device: 'Mobile - Safari',
    pagesVisited: ['Homepage'],
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Hi! How can we help you today?', timestamp: '2:05 PM' },
      { type: 'visitor', content: 'Just looking around', timestamp: '2:05 PM' },
      { type: 'system', content: 'Chat ended by visitor', timestamp: '2:06 PM' },
    ],
  },
  {
    id: 'chat_010',
    visitorName: 'Patricia Lee',
    source: 'Contact Page',
    messageCount: 13,
    duration: '9:12',
    topic: 'Appointment',
    outcome: 'Escalated',
    startTime: '11:20 AM',
    date: 'Jan 12, 2026',
    device: 'Desktop - Chrome',
    pagesVisited: ['Homepage', 'Services', 'Contact Page'],
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Welcome to Kids 0-18 Pediatrics! How can I help?', timestamp: '11:20 AM' },
      { type: 'visitor', content: 'Hi, I need an urgent appointment. My child has a high fever.', timestamp: '11:20 AM' },
      { type: 'bot', senderName: 'Bot', content: 'I understand your concern. How high is the fever and when did it start?', timestamp: '11:21 AM' },
      { type: 'visitor', content: "103.5°F this morning. He's also vomiting.", timestamp: '11:21 AM' },
      { type: 'system', content: 'Escalating to staff due to urgent medical symptoms', timestamp: '11:22 AM' },
      { type: 'bot', senderName: 'Bot', content: 'That sounds serious. Let me connect you with one of our nurses right away.', timestamp: '11:22 AM' },
      { type: 'visitor', content: 'Thank you.', timestamp: '11:22 AM' },
    ],
  },
  {
    id: 'chat_011',
    visitorName: 'Thomas Adams',
    source: 'Booking Page',
    messageCount: 8,
    duration: '4:40',
    topic: 'Appointment',
    outcome: 'Booked',
    startTime: '3:15 PM',
    date: 'Jan 11, 2026',
    device: 'Mobile - Chrome',
    pagesVisited: ['Homepage', 'Booking Page'],
    patientInfo: { name: 'Ethan Adams', parentName: 'Thomas Adams', phone: '(555) 678-9012', preferredTime: 'Jan 21, 2026 at 1:00 PM' },
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Hi! Looking to book an appointment?', timestamp: '3:15 PM' },
      { type: 'visitor', content: 'Yes, follow-up visit for my son.', timestamp: '3:15 PM' },
      { type: 'bot', senderName: 'Bot', content: "Sure! What's your son's name?", timestamp: '3:16 PM' },
      { type: 'visitor', content: 'Ethan.', timestamp: '3:16 PM' },
      { type: 'bot', senderName: 'Bot', content: 'When would be a good time?', timestamp: '3:17 PM' },
      { type: 'visitor', content: 'Next Tuesday afternoon.', timestamp: '3:17 PM' },
      { type: 'bot', senderName: 'Bot', content: 'We have 1:00 PM available. Does that work?', timestamp: '3:18 PM' },
      { type: 'visitor', content: 'Perfect, book it!', timestamp: '3:18 PM' },
    ],
  },
  {
    id: 'chat_012',
    visitorName: 'Anonymous Visitor #891',
    source: 'Homepage',
    messageCount: 5,
    duration: '2:10',
    topic: 'Insurance',
    outcome: 'Info Provided',
    startTime: '4:50 PM',
    date: 'Jan 11, 2026',
    device: 'Mobile - Firefox',
    pagesVisited: ['Homepage'],
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Hi! What questions do you have?', timestamp: '4:50 PM' },
      { type: 'visitor', content: 'Do you bill insurance directly?', timestamp: '4:50 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Yes, we bill most insurance plans directly. No out-of-pocket billing.', timestamp: '4:51 PM' },
      { type: 'visitor', content: 'Great, thanks!', timestamp: '4:51 PM' },
      { type: 'bot', senderName: 'Bot', content: "You're welcome! Call us anytime.", timestamp: '4:52 PM' },
    ],
  },
  {
    id: 'chat_013',
    visitorName: 'Sarah Thompson',
    source: 'Contact Page',
    messageCount: 14,
    duration: '8:30',
    topic: 'Appointment',
    outcome: 'Booked',
    startTime: '10:10 AM',
    date: 'Jan 10, 2026',
    device: 'Desktop - Safari',
    pagesVisited: ['Homepage', 'Services', 'Contact Page'],
    patientInfo: { name: 'Noah Thompson', parentName: 'Sarah Thompson', phone: '(555) 789-0123', preferredTime: 'Jan 18, 2026 at 9:30 AM' },
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Hello! Welcome to our pediatric practice. How can we help?', timestamp: '10:10 AM' },
      { type: 'visitor', content: "I'm looking for a new pediatrician for my 2-year-old.", timestamp: '10:10 AM' },
      { type: 'bot', senderName: 'Bot', content: "Great! We'd love to meet Noah. Are you looking for a new patient appointment?", timestamp: '10:11 AM' },
      { type: 'visitor', content: 'Yes, and I have some questions about your practice.', timestamp: '10:11 AM' },
      { type: 'bot', senderName: 'Bot', content: "Of course! I'm happy to answer any questions. What would you like to know?", timestamp: '10:12 AM' },
      { type: 'visitor', content: 'Are you accepting new patients? And what insurance do you take?', timestamp: '10:12 AM' },
      { type: 'bot', senderName: 'Bot', content: "Yes, we're accepting new patients! We accept most major insurance plans. Which do you have?", timestamp: '10:13 AM' },
      { type: 'visitor', content: 'BlueCross BlueShield.', timestamp: '10:13 AM' },
      { type: 'bot', senderName: 'Bot', content: 'Perfect! We take BCBS. When would be good for a new patient visit?', timestamp: '10:14 AM' },
      { type: 'visitor', content: 'Next Saturday morning?', timestamp: '10:14 AM' },
      { type: 'bot', senderName: 'Bot', content: 'We have Saturday January 18th at 9:30 AM with Dr. Patel available. How does that sound?', timestamp: '10:15 AM' },
      { type: 'visitor', content: "Sounds perfect! Let's book it.", timestamp: '10:15 AM' },
      { type: 'system', content: 'Visitor clicked book appointment button', timestamp: '10:16 AM' },
      { type: 'bot', senderName: 'Bot', content: "Wonderful! Your appointment is confirmed. We look forward to meeting Noah!", timestamp: '10:17 AM' },
    ],
  },
  {
    id: 'chat_014',
    visitorName: 'Anonymous Visitor #445',
    source: 'Homepage',
    messageCount: 2,
    duration: '0:30',
    topic: 'Other',
    outcome: 'Abandoned',
    startTime: '1:25 PM',
    date: 'Jan 10, 2026',
    device: 'Mobile - Safari',
    pagesVisited: ['Homepage'],
    messages: [
      { type: 'bot', senderName: 'Bot', content: 'Hi there!', timestamp: '1:25 PM' },
      { type: 'system', content: 'Chat ended by visitor', timestamp: '1:25 PM' },
    ],
  },
  {
    id: 'chat_015',
    visitorName: 'Emily Foster',
    source: 'Booking Page',
    messageCount: 7,
    duration: '3:55',
    topic: 'Appointment',
    outcome: 'Booked',
    startTime: '2:40 PM',
    date: 'Jan 9, 2026',
    device: 'Mobile - Chrome',
    pagesVisited: ['Homepage', 'Booking Page'],
    patientInfo: { name: 'Grace Foster', parentName: 'Emily Foster', phone: '(555) 890-1234', preferredTime: 'Jan 17, 2026 at 4:00 PM' },
    messages: [
      { type: 'bot', senderName: 'Bot', content: "Hi! Need to schedule your child's appointment?", timestamp: '2:40 PM' },
      { type: 'visitor', content: 'Yes, annual well-child check.', timestamp: '2:40 PM' },
      { type: 'bot', senderName: 'Bot', content: "Great! What's your child's name?", timestamp: '2:41 PM' },
      { type: 'visitor', content: 'Grace.', timestamp: '2:41 PM' },
      { type: 'bot', senderName: 'Bot', content: 'When works best for you?', timestamp: '2:42 PM' },
      { type: 'visitor', content: 'Friday afternoon would be ideal.', timestamp: '2:42 PM' },
      { type: 'bot', senderName: 'Bot', content: 'Perfect! Friday 4:00 PM confirmed!', timestamp: '2:44 PM' },
    ],
  },
];

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase();

const getOutcomeColor = (outcome: 'Booked' | 'Info Provided' | 'Escalated' | 'Abandoned') => {
  switch (outcome) {
    case 'Booked':      return 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 border-transparent';
    case 'Info Provided': return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-transparent';
    case 'Escalated':   return 'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 border-transparent';
    case 'Abandoned':   return 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-transparent';
    default:            return 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-transparent';
  }
};

const getTopicColor = (topic: 'Appointment' | 'Pricing' | 'Insurance' | 'Hours' | 'Services' | 'Other') => {
  switch (topic) {
    case 'Appointment': return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-transparent';
    case 'Pricing':     return 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-transparent';
    case 'Insurance':   return 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 border-transparent';
    case 'Hours':       return 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-transparent';
    case 'Services':    return 'bg-pink-100 dark:bg-pink-950/50 text-pink-800 dark:text-pink-300 border-transparent';
    default:            return 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-transparent';
  }
};

export default function ChatLogsPage() {
  const [selectedChat, setSelectedChat] = useState<ChatLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('All Outcomes');
  const [topicFilter, setTopicFilter] = useState('All Topics');
  const [timeFilter, setTimeFilter] = useState('Today');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const filteredChats = SAMPLE_CHATS.filter((chat) => {
    const matchesSearch =
      chat.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.messages.some((msg) => msg.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesOutcome = outcomeFilter === 'All Outcomes' || chat.outcome === outcomeFilter;
    const matchesTopic = topicFilter === 'All Topics' || chat.topic === topicFilter;
    return matchesSearch && matchesOutcome && matchesTopic;
  });

  const paginatedChats = filteredChats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredChats.length / itemsPerPage);

  const filterBtn = (active: boolean) =>
    `h-8 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
      active
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
    }`;

  return (
    <div className="pt-4 pb-8 space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">Chat Logs</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Review all conversations from the website chatbot</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 gap-2 h-9 md:h-10 text-sm self-start sm:self-auto">
          <Download className="w-4 h-4" />
          Export Logs
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Total Chats Today",       value: "47",       Icon: MessageSquare, bg: "bg-blue-50 dark:bg-blue-950/40",   icon: "text-blue-600 dark:text-blue-400" },
          { label: "Bookings via Chat",        value: "32 (68%)", Icon: Calendar,      bg: "bg-green-50 dark:bg-green-950/40", icon: "text-green-600 dark:text-green-400" },
          { label: "Avg Response Time",        value: "8 sec",    Icon: Clock,         bg: "bg-amber-50 dark:bg-amber-950/40", icon: "text-amber-600 dark:text-amber-400" },
          { label: "Chat-to-Call Escalations", value: "6",        Icon: Phone,         bg: "bg-red-50 dark:bg-red-950/40",    icon: "text-red-600 dark:text-red-400" },
        ].map(({ label, value, Icon, bg, icon }) => (
          <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mt-1.5">{value}</p>
              </div>
              <div className={`p-2.5 rounded-lg flex-shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${icon}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm p-4 md:p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            placeholder="Search by visitor name or message content..."
            className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex-shrink-0 w-16">Outcome</span>
          <div className="flex gap-1.5 flex-wrap">
            {['All Outcomes', 'Booked', 'Info Provided', 'Escalated', 'Abandoned'].map((option) => (
              <button key={option} onClick={() => { setOutcomeFilter(option); setCurrentPage(1); }} className={filterBtn(outcomeFilter === option)}>
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex-shrink-0 w-16">Topic</span>
          <div className="flex gap-1.5 flex-wrap">
            {['All Topics', 'Appointment', 'Pricing', 'Insurance', 'Hours', 'Services', 'Other'].map((option) => (
              <button key={option} onClick={() => { setTopicFilter(option); setCurrentPage(1); }} className={filterBtn(topicFilter === option)}>
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex-shrink-0 w-16">Time</span>
          <div className="flex gap-1.5">
            {['Today', 'This Week', 'This Month'].map((option) => (
              <button key={option} onClick={() => setTimeFilter(option)} className={filterBtn(timeFilter === option)}>
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chats Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Conversations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Time</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Visitor</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Source</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Messages</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Duration</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Topic</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Outcome</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedChats.map((chat) => (
                <tr key={chat.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="text-slate-900 dark:text-slate-100 font-medium">{chat.startTime}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{chat.date}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {chat.visitorName.startsWith('Anonymous')
                          ? chat.visitorName.split('#')[1]?.slice(0, 2) || 'AN'
                          : getInitials(chat.visitorName)}
                      </div>
                      <div className="text-slate-900 dark:text-slate-100 font-medium">{chat.visitorName}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-md border bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-600/60">
                      {chat.source}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{chat.messageCount}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{chat.duration}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md ${getTopicColor(chat.topic)}`}>
                      {chat.topic}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md ${getOutcomeColor(chat.outcome)}`}>
                      {chat.outcome}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      onClick={() => setSelectedChat(chat)}
                    >
                      View Conversation
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredChats.length)} of {filteredChats.length} total chats
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              className="flex items-center gap-1 h-8 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              className="flex items-center gap-1 h-8 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Conversation Dialog */}
      <Dialog open={!!selectedChat} onOpenChange={() => setSelectedChat(null)}>
        <DialogContent className="w-full h-screen md:max-w-3xl md:max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          {selectedChat && (
            <div className="space-y-4">
              {/* Header */}
              <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{selectedChat.visitorName}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{selectedChat.source}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {[
                    { label: 'Date & Time', value: `${selectedChat.date} ${selectedChat.startTime}` },
                    { label: 'Duration', value: selectedChat.duration },
                    { label: 'Total Messages', value: String(selectedChat.messageCount) },
                    { label: 'Device', value: selectedChat.device },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                      <p className="text-slate-900 dark:text-slate-100">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Topic</p>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md ${getTopicColor(selectedChat.topic)}`}>{selectedChat.topic}</span>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Outcome</p>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md ${getOutcomeColor(selectedChat.outcome)}`}>{selectedChat.outcome}</span>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">Lead Captured</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium">{selectedChat.patientInfo ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">Pages Visited</p>
                    <p className="text-slate-900 dark:text-slate-100 text-xs">{selectedChat.pagesVisited.join(', ')}</p>
                  </div>
                </div>
              </div>

              {/* Patient Info */}
              {selectedChat.patientInfo && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/60 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-3">Patient Information Captured</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {[
                      { label: 'Patient Name', value: selectedChat.patientInfo.name },
                      { label: 'Parent Name', value: selectedChat.patientInfo.parentName },
                      { label: 'Phone', value: selectedChat.patientInfo.phone },
                      { label: 'Preferred Appointment', value: selectedChat.patientInfo.preferredTime },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-slate-600 dark:text-slate-400">{label}</p>
                        <p className="text-slate-900 dark:text-slate-100 font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcript */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">Transcript</h3>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                  {selectedChat.messages.map((msg, idx) => (
                    <div key={idx}>
                      {msg.type === 'system' ? (
                        <div className="flex justify-center">
                          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                            {msg.content}
                          </span>
                        </div>
                      ) : msg.type === 'bot' ? (
                        <div className="flex gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">B</div>
                          <div className="flex-1">
                            <div className="bg-blue-100 dark:bg-blue-950/50 rounded-lg p-3 text-sm max-w-xs">
                              <p className="font-semibold text-blue-900 dark:text-blue-300 text-xs">{msg.senderName}</p>
                              <p className="text-slate-900 dark:text-slate-100">{msg.content}</p>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{msg.timestamp}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <div className="flex-1 text-right">
                            <div className="bg-slate-200 dark:bg-slate-700 rounded-lg p-3 text-sm max-w-xs ml-auto">
                              <p className="text-slate-900 dark:text-slate-100">{msg.content}</p>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{msg.timestamp}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-semibold flex-shrink-0">V</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex gap-2 justify-end flex-wrap">
                <Button variant="outline" className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Add Note</Button>
                <Button variant="outline" className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Create Patient Record</Button>
                <Button variant="outline" className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Mark as Reviewed</Button>
                <Button className="bg-blue-600 hover:bg-blue-700">Follow Up</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
