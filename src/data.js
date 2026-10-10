// Demonstration data only. Replace it with verified ward records before a public launch.
// Coordinates are clustered around IIITDM Kancheepuram only so the map is useful in a demo.
export const demoProjects = [
  {
    id: 'demo-001', title: 'Drainage line desilting and repair', category: 'Drainage', status: 'ongoing',
    department: 'Municipal Engineering', ward: 'Ward 12', contractor: 'Demo contractor — A1 Civil Works',
    responsibleOfficer: 'Ward Engineering Officer', description: 'Desilting of the storm-water drain and replacement of two damaged cover slabs along the service road.',
    latitude: 12.8399, longitude: 80.1508, plannedStart: '2026-10-06', actualStart: '2026-10-06', plannedEnd: '2026-10-14', actualEnd: '', workStartTime: '08:00', workEndTime: '17:00',
    progress: 65, estimatedCost: 460000, spentToDate: 280000, materials: 'Reinforced concrete cover slabs; approved cement mix',
    qualityNotes: 'Material and measurements pending final site inspection.', affectedResidents: 'Residents on the service road; pedestrians; two nearby shops',
    impacts: ['Partial footpath closure', 'Temporary noise during working hours'], safety: ['Open drain section is barricaded', 'Use the marked pedestrian crossing'],
    trafficPlan: 'Pedestrians should use the marked temporary walkway on the east side.', lastUpdated: '2026-10-09T11:30:00+05:30', delayReason: '', source: 'Sample data for hackathon demonstration',
    updates: [
      { date: '2026-10-09', title: 'Work is 65% complete', detail: 'Desilting completed on the first stretch; cover slab work is underway.' },
      { date: '2026-10-06', title: 'Work started', detail: 'Barricades placed and first section opened for maintenance.' }
    ]
  },
  {
    id: 'demo-006', title: 'Underground cable duct maintenance', category: 'Electricity', status: 'planned',
    department: 'Electrical Maintenance', ward: 'Ward 12', contractor: 'Demo contractor — BrightPath Services',
    responsibleOfficer: 'Electrical Maintenance Supervisor', description: 'Planned cable-duct maintenance near the same service-road stretch as the drainage repair. This sample record exists to demonstrate coordination warnings.',
    latitude: 12.8402, longitude: 80.1520, plannedStart: '2026-10-11', actualStart: '', plannedEnd: '2026-10-16', actualEnd: '', workStartTime: '09:00', workEndTime: '17:00',
    progress: 0, estimatedCost: 185000, spentToDate: 0, materials: 'Cable duct covers and approved electrical conduit',
    qualityNotes: 'Inspection and reinstatement check to be recorded after the work.', affectedResidents: 'Residents and pedestrians using the service road; nearby drainage work may also affect access',
    impacts: ['Possible overlapping work-zone disruption'], safety: ['Keep clear of any marked electrical work zone'],
    trafficPlan: 'Confirm the work boundary and schedule with the drainage team before excavation.', lastUpdated: '2026-10-09T12:00:00+05:30', delayReason: '', source: 'Sample data for hackathon demonstration',
    updates: [{ date: '2026-10-09', title: 'Coordination check recommended', detail: 'Dates and location are close to a drainage project in the sample data. Ward teams should confirm whether the sites overlap before starting.' }]
  },
  {
    id: 'demo-002', title: 'Streetlight replacement near bus stop', category: 'Streetlight', status: 'planned',
    department: 'Electrical Maintenance', ward: 'Ward 12', contractor: 'Demo contractor — BrightPath Services',
    responsibleOfficer: 'Electrical Maintenance Supervisor', description: 'Replacement of four non-working streetlight fittings and inspection of the junction control box.',
    latitude: 12.8440, longitude: 80.1547, plannedStart: '2026-10-12', actualStart: '', plannedEnd: '2026-10-13', actualEnd: '', workStartTime: '20:00', workEndTime: '23:00',
    progress: 0, estimatedCost: 78000, spentToDate: 0, materials: 'LED streetlight fittings, weatherproof connectors',
    qualityNotes: 'Final night-time illumination check to be recorded before closure.', affectedResidents: 'Residents near the bus stop and people using the junction after dark',
    impacts: ['Short-term obstruction below the maintenance vehicle'], safety: ['Keep clear of the work vehicle and lifting equipment'],
    trafficPlan: 'No full road closure planned. Brief pedestrian diversion may be used.', lastUpdated: '2026-10-08T16:00:00+05:30', delayReason: '', source: 'Sample data for hackathon demonstration',
    updates: [{ date: '2026-10-08', title: 'Work scheduled', detail: 'Material request approved; work is planned for October 12.' }]
  },
  {
    id: 'demo-003', title: 'Road resurfacing — Lake View Street', category: 'Road', status: 'delayed',
    department: 'Roads and Highways', ward: 'Ward 11', contractor: 'Demo contractor — South Roads Co.',
    responsibleOfficer: 'Assistant Engineer, Roads', description: 'Resurfacing damaged patches and restoring road markings after utility work.',
    latitude: 12.8359, longitude: 80.1580, plannedStart: '2026-10-01', actualStart: '2026-10-02', plannedEnd: '2026-10-08', actualEnd: '', workStartTime: '07:00', workEndTime: '18:00',
    progress: 45, estimatedCost: 920000, spentToDate: 390000, materials: 'Bituminous mix as per approved work order; road-marking paint',
    qualityNotes: 'Surface-level and compaction inspection required before reopening.', affectedResidents: 'Daily commuters, nearby residents, delivery vehicles and local shops',
    impacts: ['Single-lane traffic', 'Increased travel time', 'Dust near unfinished sections'], safety: ['Slow down near the work zone', 'Avoid the unsealed edge of the road'],
    trafficPlan: 'Traffic is alternating through one lane; follow temporary signs.', lastUpdated: '2026-10-09T09:00:00+05:30', delayReason: 'Rain interrupted surface preparation; revised finish date awaits officer confirmation.', source: 'Sample data for hackathon demonstration',
    updates: [
      { date: '2026-10-09', title: 'Completion date under review', detail: 'Rain affected surface preparation. The responsible office must confirm a revised date.' },
      { date: '2026-10-02', title: 'Work started', detail: 'First road section closed for resurfacing.' }
    ]
  },
  {
    id: 'demo-004', title: 'Water pipeline leak repair', category: 'Water supply', status: 'completed',
    department: 'Water Supply Board', ward: 'Ward 12', contractor: 'Demo contractor — AquaLine Utilities',
    responsibleOfficer: 'Water Supply Field Engineer', description: 'Repair of a leaking distribution pipe and restoration of the excavated road shoulder.',
    latitude: 12.8470, longitude: 80.1485, plannedStart: '2026-09-26', actualStart: '2026-09-26', plannedEnd: '2026-09-27', actualEnd: '2026-09-28', workStartTime: '09:00', workEndTime: '16:00',
    progress: 100, estimatedCost: 135000, spentToDate: 129000, materials: 'Approved HDPE pipe section, couplers and reinstatement material',
    qualityNotes: 'Demo inspection marked as complete; citizen verification is still welcome.', affectedResidents: 'Homes connected to the local distribution line',
    impacts: ['Water supply interruption during repair'], safety: ['Keep away from the recently restored shoulder until the surface settles'],
    trafficPlan: 'Excavation is closed and the road shoulder reopened.', lastUpdated: '2026-09-28T18:00:00+05:30', delayReason: '', source: 'Sample data for hackathon demonstration',
    updates: [{ date: '2026-09-28', title: 'Work completed', detail: 'Pipe leak repaired and temporary restoration completed.' }, { date: '2026-09-26', title: 'Work started', detail: 'Supply interruption announced for repair.' }]
  },
  {
    id: 'demo-005', title: 'Footpath ramp accessibility improvement', category: 'Footpath', status: 'planned',
    department: 'Public Works Department', ward: 'Ward 13', contractor: 'To be assigned',
    responsibleOfficer: 'Ward Works Officer', description: 'Rebuilding a damaged footpath ramp to improve access for wheelchair users and people with strollers.',
    latitude: 12.8325, longitude: 80.1474, plannedStart: '2026-10-19', actualStart: '', plannedEnd: '2026-10-22', actualEnd: '', workStartTime: '09:00', workEndTime: '17:00',
    progress: 0, estimatedCost: 210000, spentToDate: 0, materials: 'Anti-slip pavers and concrete ramp finish',
    qualityNotes: 'Accessibility and slope to be checked at handover.', affectedResidents: 'Pedestrians, wheelchair users and caregivers',
    impacts: ['Temporary narrowing of the footpath'], safety: ['Use the crossing to access the opposite footpath if needed'],
    trafficPlan: 'A temporary accessible route should be maintained throughout construction.', lastUpdated: '2026-10-07T12:00:00+05:30', delayReason: '', source: 'Sample data for hackathon demonstration',
    updates: [{ date: '2026-10-07', title: 'Work approved', detail: 'Work order approved; start is planned for October 19.' }]
  }
];

export const demoReports = [
  {
    id: 'demo-report-1', ticketCode: 'CW-8K2P4M', title: 'Barricade has shifted near drainage work', category: 'Safety hazard',
    description: 'Sample report: a temporary barrier appears to have shifted toward the walking path.', latitude: 12.8401, longitude: 80.1510, ward: 'Ward 12',
    status: 'in_review', response: 'Demo report only. An authorized ward officer would review this report.', createdAt: '2026-10-09T10:20:00+05:30', contact: ''
  }
];
