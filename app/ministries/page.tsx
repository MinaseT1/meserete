"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart, Plus, Search, Filter, MoreHorizontal, Users, Eye, Edit, UserPlus, X, Calendar, MapPin, Clock, FileText } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Ministry {
  id: string;
  name: string;
  description: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  location: string | null;
  capacity: number | null;
  isActive: boolean;
  createdAt: string;
  leaderId: string | null;
  notes: string | null;
  leaders: string[];
  _count: {
    members: number;
  };
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  joinDate?: string;
  role?: string;
}

export default function MinistriesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editMinistryOpen, setEditMinistryOpen] = useState(false);
  const [manageParticipantsOpen, setManageParticipantsOpen] = useState(false);
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  
  // Edit form states
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    meetingDay: "",
    meetingTime: "",
    location: "",
    capacity: "",
    isActive: true,
    notes: ""
  });
  
  // Participants management states
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [ministryMembers, setMinistryMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  useEffect(() => {
    fetchMinistries();
  }, []);

  const fetchMinistries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ministries');
      const data = await response.json();
      
      if (data.success) {
        setMinistries(data.ministries);
      } else {
        setError('Failed to load ministries');
      }
    } catch (err) {
      setError('Error loading ministries');
      console.error('Error fetching ministries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (ministry: Ministry) => {
    setSelectedMinistry(ministry);
    setViewDetailsOpen(true);
  };

  const handleEditMinistry = (ministry: Ministry) => {
    setSelectedMinistry(ministry);
    setEditForm({
      name: ministry.name,
      description: ministry.description || "",
      meetingDay: ministry.meetingDay || "",
      meetingTime: ministry.meetingTime || "",
      location: ministry.location || "",
      capacity: ministry.capacity?.toString() || "",
      isActive: ministry.isActive,
      notes: ministry.notes || ""
    });
    setEditMinistryOpen(true);
  };

  const handleManageParticipants = async (ministry: Ministry) => {
    setSelectedMinistry(ministry);
    setLoadingMembers(true);
    setManageParticipantsOpen(true);
    
    try {
      // Fetch all members from the system
      const allMembersResponse = await fetch('/api/members');
      const allMembersData = await allMembersResponse.json();
      
      // Fetch members who are currently in this ministry
      const ministryMembersResponse = await fetch(`/api/ministries/${ministry.id}/members`);
      const ministryMembersData = await ministryMembersResponse.json();
      
      if (allMembersData.success && ministryMembersData.success) {
        // Set all members for the dropdown/selection
        setAllMembers(allMembersData.members);
        // Set current ministry members
        setMinistryMembers(ministryMembersData.members);
      } else {
        console.error('Failed to fetch data:', { allMembersData, ministryMembersData });
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSaveMinistry = async () => {
    if (!selectedMinistry) return;
    
    try {
      const response = await fetch(`/api/ministries/${selectedMinistry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editForm,
          capacity: editForm.capacity ? parseInt(editForm.capacity) : null
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchMinistries();
        setEditMinistryOpen(false);
      } else {
        console.error('Failed to update ministry:', data.error);
      }
    } catch (err) {
      console.error('Error updating ministry:', err);
    }
  };

  const handleToggleMemberParticipation = async (memberId: string, isCurrentlyInMinistry: boolean) => {
    if (!selectedMinistry) return;
    
    try {
      const endpoint = isCurrentlyInMinistry 
        ? `/api/ministries/${selectedMinistry.id}/members/${memberId}`
        : `/api/ministries/${selectedMinistry.id}/members`;
      
      const method = isCurrentlyInMinistry ? 'DELETE' : 'POST';
      const body = isCurrentlyInMinistry ? undefined : JSON.stringify({ memberId });
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh ministry members to update the UI
        const ministryMembersResponse = await fetch(`/api/ministries/${selectedMinistry.id}/members`);
        const ministryMembersData = await ministryMembersResponse.json();
        
        if (ministryMembersData.success) {
          setMinistryMembers(ministryMembersData.members);
        }
        
        // Refresh ministries to update counts
        await fetchMinistries();
      } else {
        console.error('Failed to toggle member participation:', data.error);
      }
    } catch (err) {
      console.error('Error toggling member participation:', err);
    }
  };

  const filteredMinistries = ministries.filter((ministry) => {
    const matchesSearch = ministry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ministry.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "All" || 
                         (filterStatus === "Active" && ministry.isActive) ||
                         (filterStatus === "Inactive" && !ministry.isActive);
    return matchesSearch && matchesFilter;
  });

  const activeMinistries = ministries.filter(m => m.isActive).length;
  const totalParticipants = ministries.reduce((sum, m) => sum + m._count.members, 0);
  const ministriesWithLeaders = ministries.filter(m => m.leaders && m.leaders.length > 0).length;
  const totalLeaders = ministries.reduce((sum, m) => sum + (m.leaders ? m.leaders.length : 0), 0);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
              <div className="flex items-center justify-between space-y-2">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Ministries</h2>
                  <p className="text-muted-foreground">
                    Manage church ministries and their activities
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={() => router.push('/registration/ministries')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Ministry
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Ministries</CardTitle>
                    <Heart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{ministries.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {activeMinistries} active ministries
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Leaders</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalLeaders}</div>
                    <p className="text-xs text-muted-foreground">
                      {ministriesWithLeaders} ministries with leaders
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalParticipants}</div>
                    <p className="text-xs text-muted-foreground">
                      Across all ministries
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search ministries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>

              {/* Ministries Table */}
              <Card>
                <CardHeader>
                  <CardTitle>All Ministries</CardTitle>
                  <CardDescription>
                    A list of all church ministries and their current status.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ministry Name</TableHead>
                        <TableHead>Leader</TableHead>
                        <TableHead>Participants</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Next Meeting</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              <p className="text-muted-foreground">Loading ministries...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : error ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center space-y-2">
                              <Heart className="h-8 w-8 text-red-500" />
                              <p className="text-red-500">{error}</p>
                              <Button onClick={fetchMinistries} variant="outline" size="sm">
                                Try Again
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredMinistries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center space-y-2">
                              <Heart className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                {ministries.length === 0 ? "No ministries found" : "No ministries match your search"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {ministries.length === 0 ? "Start by adding your first ministry" : "Try adjusting your search criteria"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMinistries.map((ministry) => (
                          <TableRow key={ministry.id}>
                            <TableCell className="font-medium">{ministry.name}</TableCell>
                            <TableCell>
                              {ministry.leaders && ministry.leaders.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {ministry.leaders.map((leader, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {leader}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No leader assigned</span>
                              )}
                            </TableCell>
                            <TableCell>{ministry._count.members}</TableCell>
                            <TableCell>
                              <Badge variant={ministry.isActive ? "default" : "secondary"}>
                                {ministry.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {ministry.meetingDay && ministry.meetingTime 
                                ? `${ministry.meetingDay} at ${ministry.meetingTime}`
                                : "Not scheduled"
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleViewDetails(ministry)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditMinistry(ministry)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Ministry
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleManageParticipants(ministry)}>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Manage Participants
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Schedule Meeting
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    Delete Ministry
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* View Details Modal */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Ministry Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about {selectedMinistry?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedMinistry && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Ministry Name</Label>
                  <p className="text-lg font-semibold">{selectedMinistry.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedMinistry.isActive ? "default" : "secondary"}>
                      {selectedMinistry.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {selectedMinistry.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{selectedMinistry.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Meeting Schedule
                  </Label>
                  <p className="mt-1 text-sm">
                    {selectedMinistry.meetingDay && selectedMinistry.meetingTime 
                      ? `${selectedMinistry.meetingDay} at ${selectedMinistry.meetingTime}`
                      : "Not scheduled"
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <p className="mt-1 text-sm">{selectedMinistry.location || "Not specified"}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Participants
                  </Label>
                  <p className="mt-1 text-sm">{selectedMinistry._count.members} members</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Capacity</Label>
                  <p className="mt-1 text-sm">{selectedMinistry.capacity || "No limit"}</p>
                </div>
              </div>
              
              {selectedMinistry.leaders && selectedMinistry.leaders.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Leaders</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedMinistry.leaders.map((leader, index) => (
                      <Badge key={index} variant="outline">{leader}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedMinistry.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Notes
                  </Label>
                  <p className="mt-1 text-sm">{selectedMinistry.notes}</p>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                <p className="mt-1 text-sm">{new Date(selectedMinistry.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
       </Dialog>

       {/* Edit Ministry Modal */}
       <Dialog open={editMinistryOpen} onOpenChange={setEditMinistryOpen}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <Edit className="h-5 w-5" />
               Edit Ministry
             </DialogTitle>
             <DialogDescription>
               Update the information for {selectedMinistry?.name}
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="name">Ministry Name</Label>
                 <Input
                   id="name"
                   value={editForm.name}
                   onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                   placeholder="Enter ministry name"
                 />
               </div>
               <div>
                 <Label htmlFor="status">Status</Label>
                 <Select value={editForm.isActive.toString()} onValueChange={(value) => setEditForm({...editForm, isActive: value === 'true'})}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="true">Active</SelectItem>
                     <SelectItem value="false">Inactive</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
             
             <div>
               <Label htmlFor="description">Description</Label>
               <Textarea
                 id="description"
                 value={editForm.description}
                 onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                 placeholder="Enter ministry description"
                 rows={3}
               />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="meetingDay">Meeting Day</Label>
                 <Select value={editForm.meetingDay} onValueChange={(value) => setEditForm({...editForm, meetingDay: value})}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select day" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Sunday">Sunday</SelectItem>
                     <SelectItem value="Monday">Monday</SelectItem>
                     <SelectItem value="Tuesday">Tuesday</SelectItem>
                     <SelectItem value="Wednesday">Wednesday</SelectItem>
                     <SelectItem value="Thursday">Thursday</SelectItem>
                     <SelectItem value="Friday">Friday</SelectItem>
                     <SelectItem value="Saturday">Saturday</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div>
                 <Label htmlFor="meetingTime">Meeting Time</Label>
                 <Input
                   id="meetingTime"
                   type="time"
                   value={editForm.meetingTime}
                   onChange={(e) => setEditForm({...editForm, meetingTime: e.target.value})}
                 />
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="location">Location</Label>
                 <Input
                   id="location"
                   value={editForm.location}
                   onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                   placeholder="Enter meeting location"
                 />
               </div>
               <div>
                 <Label htmlFor="capacity">Capacity</Label>
                 <Input
                   id="capacity"
                   type="number"
                   value={editForm.capacity}
                   onChange={(e) => setEditForm({...editForm, capacity: e.target.value})}
                   placeholder="Enter capacity (optional)"
                 />
               </div>
             </div>
             
             <div>
               <Label htmlFor="notes">Notes</Label>
               <Textarea
                 id="notes"
                 value={editForm.notes}
                 onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                 placeholder="Enter additional notes"
                 rows={3}
               />
             </div>
             
             <div className="flex justify-end space-x-2 pt-4">
               <Button variant="outline" onClick={() => setEditMinistryOpen(false)}>
                 Cancel
               </Button>
               <Button onClick={handleSaveMinistry}>
                 Save Changes
               </Button>
             </div>
           </div>
         </DialogContent>
        </Dialog>

        {/* Manage Participants Modal */}
        <Dialog open={manageParticipantsOpen} onOpenChange={setManageParticipantsOpen}>
          <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] overflow-hidden p-0">
            <div className="p-6 flex flex-col h-full">
              <DialogHeader className="mb-4">
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Ministry Members - {selectedMinistry?.name}
                </DialogTitle>
                <DialogDescription>
                  View and manage members in this ministry. Total members: {ministryMembers.length}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-col flex-1">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              {/* Members List */}
              <div className="flex-1 overflow-auto border rounded-lg">
                {loadingMembers ? (
                  <div className="flex flex-col items-center justify-center h-32 space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Loading members...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Join Date</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ministryMembers
                        .filter(member => 
                          member.firstName.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                          member.lastName.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                          member.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
                        )
                        .map((member) => {
                          return (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">
                                {member.firstName} {member.lastName}
                              </TableCell>
                              <TableCell>{member.email}</TableCell>
                              <TableCell>{member.phone || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant={member.status === 'ACTIVE' ? "default" : "secondary"}>
                                  {member.status === 'ACTIVE' ? "Active" : member.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {member.joinDate ? (
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(member.joinDate).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">N/A</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {member.role || 'Member'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleToggleMemberParticipation(member.id, true)}
                                  disabled={member.status !== 'ACTIVE'}
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      }
                    </TableBody>
                  </Table>
                )}
              </div>
              
              {/* Summary */}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex gap-6">
                    <div>
                      <span className="text-sm font-medium">Total Members:</span>
                      <span className="ml-2 text-sm">{ministryMembers.length}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Active Members:</span>
                      <span className="ml-2 text-sm">{ministryMembers.filter(m => m.status === 'ACTIVE').length}</span>
                    </div>
                    {selectedMinistry?.capacity && (
                      <div>
                        <span className="text-sm font-medium">Capacity:</span>
                        <span className="ml-2 text-sm">{selectedMinistry.capacity}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => setManageParticipantsOpen(false)}>
                    <X className="mr-2 h-4 w-4" />
                    Close
                  </Button>
                </div>
              </div>
            </div>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    );
  }