// Mock data for development — will be replaced with real AD4M queries

export interface MockEvent {
  id: string
  name: string
  startDate: string
  endDate: string
  location: string
  description: string
  status: string
  calendarId: string
  visibility: string
}

export interface MockCalendar {
  id: string
  name: string
  color: string
  isDefault: boolean
  isVisible: boolean
}

export const CALENDAR_COLORS = [
  '#4285f4',
  '#ea4335',
  '#34a853',
  '#fbbc04',
  '#ff6d01',
  '#46bdc6',
  '#7986cb',
  '#8e24aa'
] as const

function weekDate(dayOffset: number, hour: number, minute = 0): string {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(hour, minute, 0, 0)
  monday.setDate(monday.getDate() + dayOffset)
  return monday.toISOString()
}

export const MOCK_CALENDARS: MockCalendar[] = [
  { id: 'personal', name: 'Personal', color: '#4285f4', isDefault: true, isVisible: true },
  { id: 'work', name: 'Work', color: '#ea4335', isDefault: false, isVisible: true },
  { id: 'health', name: 'Health & Fitness', color: '#34a853', isDefault: false, isVisible: true }
]

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: 'evt-1',
    name: 'Team Standup',
    calendarId: 'work',
    startDate: weekDate(0, 9, 0),
    endDate: weekDate(0, 9, 30),
    location: '',
    description: 'Daily sync',
    status: 'EventScheduled',
    visibility: 'private'
  },
  {
    id: 'evt-2',
    name: 'Lunch with Alex',
    calendarId: 'personal',
    startDate: weekDate(0, 12, 0),
    endDate: weekDate(0, 13, 0),
    location: 'Sushi Bar',
    description: '',
    status: 'EventScheduled',
    visibility: 'private'
  },
  {
    id: 'evt-3',
    name: 'Sprint Planning',
    calendarId: 'work',
    startDate: weekDate(1, 10, 0),
    endDate: weekDate(1, 11, 30),
    location: 'Room 4B',
    description: 'Q2 sprint kickoff',
    status: 'EventScheduled',
    visibility: 'private'
  },
  {
    id: 'evt-4',
    name: 'Gym Session',
    calendarId: 'health',
    startDate: weekDate(1, 17, 0),
    endDate: weekDate(1, 18, 0),
    location: 'Fitness First',
    description: '',
    status: 'EventScheduled',
    visibility: 'private'
  },
  {
    id: 'evt-5',
    name: 'Design Review',
    calendarId: 'work',
    startDate: weekDate(2, 14, 0),
    endDate: weekDate(2, 15, 0),
    location: '',
    description: 'Review new mockups',
    status: 'EventScheduled',
    visibility: 'private'
  },
  {
    id: 'evt-6',
    name: 'Dentist Appointment',
    calendarId: 'personal',
    startDate: weekDate(3, 11, 0),
    endDate: weekDate(3, 12, 0),
    location: 'Melbourne Dental',
    description: '',
    status: 'EventScheduled',
    visibility: 'private'
  },
  {
    id: 'evt-7',
    name: 'Yoga Class',
    calendarId: 'health',
    startDate: weekDate(3, 7, 0),
    endDate: weekDate(3, 8, 0),
    location: 'Studio B',
    description: '',
    status: 'EventScheduled',
    visibility: 'private'
  },
  {
    id: 'evt-8',
    name: 'Product Demo',
    calendarId: 'work',
    startDate: weekDate(4, 15, 0),
    endDate: weekDate(4, 16, 0),
    location: 'Zoom',
    description: 'Show stakeholders the prototype',
    status: 'EventScheduled',
    visibility: 'private'
  },
  {
    id: 'evt-9',
    name: 'Weekend Hike',
    calendarId: 'personal',
    startDate: weekDate(5, 8, 0),
    endDate: weekDate(5, 12, 0),
    location: 'Dandenong Ranges',
    description: '',
    status: 'EventScheduled',
    visibility: 'private'
  },
  {
    id: 'evt-10',
    name: 'Brunch',
    calendarId: 'personal',
    startDate: weekDate(6, 10, 0),
    endDate: weekDate(6, 11, 30),
    location: 'Lune Croissanterie',
    description: '',
    status: 'EventScheduled',
    visibility: 'private'
  }
]
