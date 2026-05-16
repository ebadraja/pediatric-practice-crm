'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import InviteStaffModal from '@/components/invite-staff-modal';
import {
  Users,
  UserPlus,
  Clock,
  Shield,
  Search,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  User,
  Lock,
  Eye,
  Mail,
  Calendar,
  Activity,
  FileText,
  Phone,
  BarChart3,
} from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Staff' | 'Viewer';
  subtitle: string;
  status: 'online' | 'away' | 'inactive';
  lastActive: string;
  joinedDate: string;
  permissions: {
    patients: boolean;
    appointments: boolean;
    calls: boolean;
    chats: boolean;
    reports: boolean;
    settings: boolean;
    staffManagement: boolean;
    billing: boolean;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  role: 'Admin' | 'Staff' | 'Viewer';
  invitedDate: string;
}

interface ActivityLogEntry {
  id: string;
  userName: string;
  userInitials: string;
  action: string;
  timestamp: string;
  type: 'login' | 'view' | 'update' | 'export' | 'delete';
}

const STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff_001',
    name: 'Dr. Jonathan Tamas',
    email: 'jonathan.tamas@kids018.com',
    role: 'Admin',
    subtitle: 'Physician',
    status: 'online',
    lastActive: 'Online now',
    joinedDate: 'Jan 5, 2025',
    permissions: {
      patients: true,
      appointments: true,
      calls: true,
      chats: true,
      reports: true,
      settings: true,
      staffManagement: true,
      billing: true,
    },
  },
  {
    id: 'staff_002',
    name: 'Dr. Peaches Richards',
    email: 'peaches.richards@kids018.com',
    role: 'Admin',
    subtitle: 'Physician',
    status: 'online',
    lastActive: 'Online now',
    joinedDate: 'Jan 8, 2025',
    permissions: {
      patients: true,
      appointments: true,
      calls: true,
      chats: true,
      reports: true,
      settings: true,
      staffManagement: true,
      billing: true,
    },
  },
  {
    id: 'staff_003',
    name: 'Jenny Martinez',
    email: 'jenny.martinez@kids018.com',
    role: 'Staff',
    subtitle: 'Receptionist',
    status: 'online',
    lastActive: 'Online now',
    joinedDate: 'Feb 1, 2025',
    permissions: {
      patients: true,
      appointments: true,
      calls: true,
      chats: true,
      reports: false,
      settings: false,
      staffManagement: false,
      billing: false,
    },
  },
  {
    id: 'staff_004',
    name: 'Josh Thompson',
    email: 'josh.thompson@kids018.com',
    role: 'Staff',
    subtitle: 'Receptionist',
    status: 'away',
    lastActive: '2 hours ago',
    joinedDate: 'Feb 15, 2025',
    permissions: {
      patients: true,
      appointments: true,
      calls: true,
      chats: true,
      reports: false,
      settings: false,
      staffManagement: false,
      billing: false,
    },
  },
  {
    id: 'staff_005',
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@kids018.com',
    role: 'Staff',
    subtitle: 'Nurse',
    status: 'online',
    lastActive: 'Online now',
    joinedDate: 'Feb 10, 2025',
    permissions: {
      patients: true,
      appointments: true,
      calls: true,
      chats: true,
      reports: false,
      settings: false,
      staffManagement: false,
      billing: false,
    },
  },
  {
    id: 'staff_006',
    name: 'Maria Rodriguez',
    email: 'maria.rodriguez@kids018.com',
    role: 'Staff',
    subtitle: 'Nurse',
    status: 'inactive',
    lastActive: '1 day ago',
    joinedDate: 'Mar 1, 2025',
    permissions: {
      patients: true,
      appointments: true,
      calls: true,
      chats: true,
      reports: false,
      settings: false,
      staffManagement: false,
      billing: false,
    },
  },
  {
    id: 'staff_007',
    name: 'David Park',
    email: 'david.park@kids018.com',
    role: 'Viewer',
    subtitle: 'Billing',
    status: 'online',
    lastActive: 'Online now',
    joinedDate: 'Mar 5, 2025',
    permissions: {
      patients: true,
      appointments: true,
      calls: false,
      chats: false,
      reports: true,
      settings: false,
      staffManagement: false,
      billing: true,
    },
  },
  {
    id: 'staff_008',
    name: 'Lisa Chen',
    email: 'lisa.chen@kids018.com',
    role: 'Staff',
    subtitle: 'Office Manager',
    status: 'online',
    lastActive: '30 min ago',
    joinedDate: 'Mar 10, 2025',
    permissions: {
      patients: true,
      appointments: true,
      calls: true,
      chats: true,
      reports: false,
      settings: false,
      staffManagement: false,
      billing: false,
    },
  },
];

const PENDING_INVITES: PendingInvite[] = [
  {
    id: 'invite_001',
    email: 'new.staff@kids018.com',
    role: 'Staff',
    invitedDate: 'Jan 11, 2026',
  },
];

const ACTIVITY_LOG: ActivityLogEntry[] = [
  {
    id: 'log_001',
    userName: 'Jenny Martinez',
    userInitials: 'JM',
    action: 'logged in',
    timestamp: '10 min ago',
    type: 'login',
  },
  {
    id: 'log_002',
    userName: 'Dr. Jonathan Tamas',
    userInitials: 'JT',
    action: 'viewed patient: Emma Wilson',
    timestamp: '25 min ago',
    type: 'view',
  },
  {
    id: 'log_003',
    userName: 'Sarah Mitchell',
    userInitials: 'SM',
    action: 'updated appointment for Lucas Brown',
    timestamp: '1 hour ago',
    type: 'update',
  },
  {
    id: 'log_004',
    userName: 'David Park',
    userInitials: 'DP',
    action: 'exported call logs (January)',
    timestamp: '2 hours ago',
    type: 'export',
  },
  {
    id: 'log_005',
    userName: 'Lisa Chen',
    userInitials: 'LC',
    action: 'created new patient record: Olivia Davis',
    timestamp: '3 hours ago',
    type: 'update',
  },
  {
    id: 'log_006',
    userName: 'Josh Thompson',
    userInitials: 'JT',
    action: 'logged out',
    timestamp: '4 hours ago',
    type: 'login',
  },
  {
    id: 'log_007',
    userName: 'Dr. Peaches Richards',
    userInitials: 'PR',
    action: 'viewed call logs',
    timestamp: '5 hours ago',
    type: 'view',
  },
  {
    id: 'log_008',
    userName: 'Maria Rodriguez',
    userInitials: 'MR',
    action: 'updated patient: Noah Martinez',
    timestamp: '1 day ago',
    type: 'update',
  },
  {
    id: 'log_009',
    userName: 'Dr. Jonathan Tamas',
    userInitials: 'JT',
    action: 'edited staff role: Lisa Chen',
    timestamp: '2 days ago',
    type: 'update',
  },
  {
    id: 'log_010',
    userName: 'Jenny Martinez',
    userInitials: 'JM',
    action: 'accessed chat logs',
    timestamp: '2 days ago',
    type: 'view',
  },
  {
    id: 'log_011',
    userName: 'Sarah Mitchell',
    userInitials: 'SM',
    action: 'created new appointment',
    timestamp: '3 days ago',
    type: 'update',
  },
  {
    id: 'log_012',
    userName: 'David Park',
    userInitials: 'DP',
    action: 'exported reports (February)',
    timestamp: '4 days ago',
    type: 'export',
  },
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

const getRoleColor = (role: 'Admin' | 'Staff' | 'Viewer') => {
  switch (role) {
    case 'Admin':
      return 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-transparent';
    case 'Staff':
      return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-transparent';
    case 'Viewer':
      return 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-transparent';
    default:
      return 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-transparent';
  }
};

const getStatusColor = (status: 'online' | 'away' | 'inactive') => {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'inactive':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
};

export default function StaffManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const filteredStaff = STAFF_MEMBERS.filter((staff) => {
    const matchesSearch =
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || staff.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeCount = STAFF_MEMBERS.filter((s) => s.status === 'online').length;
  const adminCount = STAFF_MEMBERS.filter((s) => s.role === 'Admin').length;

  return (
    <div className="pt-4 pb-8 space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">Staff Management</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 gap-2 h-9 md:h-10 text-sm self-start sm:self-auto"
          onClick={() => setShowInviteDialog(true)}
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Invite Staff Member</span>
          <span className="sm:hidden">Invite</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Staff</p>
              <p className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mt-1.5">{STAFF_MEMBERS.length}</p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex-shrink-0">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Now</p>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{activeCount}</p>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
            </div>
            <div className="p-2.5 bg-green-50 dark:bg-green-950/40 rounded-lg flex-shrink-0">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Admins</p>
              <p className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mt-1.5">{adminCount}</p>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg flex-shrink-0">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Invites</p>
              <p className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mt-1.5">{PENDING_INVITES.length}</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-slate-100 dark:bg-slate-800 h-auto gap-1 p-1">
          <TabsTrigger value="staff" className="text-xs md:text-sm py-2">All Staff</TabsTrigger>
          <TabsTrigger value="invites" className="text-xs md:text-sm py-2">
            Invites ({PENDING_INVITES.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs md:text-sm py-2">Activity</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs md:text-sm py-2">Roles</TabsTrigger>
        </TabsList>

        {/* All Staff Tab */}
        <TabsContent value="staff" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by name or email..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option>All Roles</option>
                    <option>Admin</option>
                    <option>Staff</option>
                    <option>Viewer</option>
                  </select>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredStaff.map((staff) => (
                  <div key={staff.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {getInitials(staff.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{staff.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{staff.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(staff.status)}`} />
                        <Badge className={getRoleColor(staff.role)}>{staff.role}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Last active</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">{staff.lastActive}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Joined</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">{staff.joinedDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Role</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Last Active</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Joined</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Permissions</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((staff) => (
                      <tr key={staff.id} className="border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                              {getInitials(staff.name)}
                            </div>
                            <div>
                              <div className="text-slate-900 dark:text-slate-50 font-medium">{staff.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{staff.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getRoleColor(staff.role)}>{staff.role}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(staff.status)}`} />
                            <span className="text-slate-700 dark:text-slate-300 capitalize">{staff.status}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{staff.lastActive}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{staff.joinedDate}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {staff.permissions.patients && <User className="w-4 h-4 text-blue-600" aria-label="Patients" />}
                            {staff.permissions.appointments && <Calendar className="w-4 h-4 text-green-600" aria-label="Appointments" />}
                            {staff.permissions.calls && <Phone className="w-4 h-4 text-purple-600" aria-label="Calls" />}
                            {staff.permissions.reports && <BarChart3 className="w-4 h-4 text-orange-600" aria-label="Reports" />}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Invites Tab */}
        <TabsContent value="invites">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {PENDING_INVITES.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 border border-amber-200 dark:border-amber-800/60 rounded-lg bg-amber-50 dark:bg-amber-950/20"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Mail className="w-5 h-5 text-amber-600" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {invite.email}
                        </p>
                        <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400 mt-1">
                          <span>
                            Role: <Badge className={getRoleColor(invite.role)}>{invite.role}</Badge>
                          </span>
                          <span>Invited: {invite.invitedDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Resend Invite
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ACTIVITY_LOG.map((entry) => (
                  <div key={entry.id} className="flex gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-semibold">
                        {entry.userInitials}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 dark:text-slate-100">
                        <span className="font-medium">{entry.userName}</span>{' '}
                        <span className="text-slate-500 dark:text-slate-400">{entry.action}</span>
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        {entry.timestamp}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {entry.type === 'login' && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">
                          Login
                        </span>
                      )}
                      {entry.type === 'view' && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          View
                        </span>
                      )}
                      {entry.type === 'update' && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                          Update
                        </span>
                      )}
                      {entry.type === 'export' && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300">
                          Export
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles">
          <div className="space-y-4">
            {/* Admin Role Card */}
            <Card className="border-2 border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    <CardTitle>Admin</CardTitle>
                  </div>
                  <Button variant="outline" size="sm">Edit Role</Button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Full system access with complete management capabilities
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {['Patients','Appointments','Call Logs','Chat Logs','Reports','Settings','Staff Management','Billing'].map((name) => (
                    <div key={name} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-purple-900/50">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm text-slate-900 dark:text-slate-100">{name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Staff Role Card */}
            <Card className="border-2 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <CardTitle>Staff</CardTitle>
                  </div>
                  <Button variant="outline" size="sm">Edit Role</Button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Core operational access for front-line staff
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'Patients', access: true },
                    { name: 'Appointments', access: true },
                    { name: 'Call Logs', access: true },
                    { name: 'Chat Logs', access: true },
                    { name: 'Reports', access: false },
                    { name: 'Settings', access: false },
                    { name: 'Staff Management', access: false },
                    { name: 'Billing', access: false },
                  ].map((perm) => (
                    <div key={perm.name} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-blue-900/50">
                      {perm.access
                        ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
                      }
                      <span className={`text-sm ${perm.access ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-600 line-through'}`}>
                        {perm.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Viewer Role Card */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    <CardTitle>Viewer</CardTitle>
                  </div>
                  <Button variant="outline" size="sm">Edit Role</Button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Read-only access to specific sections
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'Patients (View)', access: true },
                    { name: 'Appointments (View)', access: true },
                    { name: 'Call Logs', access: false },
                    { name: 'Chat Logs', access: false },
                    { name: 'Reports', access: true },
                    { name: 'Settings', access: false },
                    { name: 'Staff Management', access: false },
                    { name: 'Billing', access: true },
                  ].map((perm) => (
                    <div key={perm.name} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      {perm.access
                        ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
                      }
                      <span className={`text-sm ${perm.access ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-600 line-through'}`}>
                        {perm.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite Staff Modal */}
      <InviteStaffModal
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onStaffInvited={(invitation) => {
          console.log("Staff invited:", invitation);
        }}
      />
    </div>
  );
}
