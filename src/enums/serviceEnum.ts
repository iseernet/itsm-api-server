export const ServiceDataEnum: Record<string, string[]> = {
    Server: ['OS Installation/Reinstallation', 'Power On/Off/Restart', 'BIOS Firmware Upgrade', 'BIOS Settings Modification', 'NIC (Network Interface Card) Firmware Upgrade', 'Hardware Replacement', 'Fault Information Reporting'],
    Network: ['Change Port IP', 'Switch Firmware/Version/Patch Upgrade', 'Router Version/Patch Upgrade', 'Firewall Version/Patch Upgrade'],
    Storage: ['HDD Replacement/Addition/Removal', 'HDD Firmware Upgrade', 'RAID Controller Firmware Upgrade', 'RAID Configuration'],
    Others: ['Cabling (Structured Cabling)', 'Cable/Optical Module Troubleshooting', 'Equipment Rack Mounting/Dismounting', 'Inspection/Routine Check', 'Daily Maintenance'],

};



export const MaintenanceSystem = ['Monitoring & Alerts', 'ITSM System', 'Bare Metal Management Platform']

export const OperationPermissions = ['DEFAULT','DEBUG', 'ONLINE', 'ONLINE_STORAGE', 'OFFLINE', 'OFFLINE_WITH_REINSTALL', 'REPLACE', 'NET_OFFLINE']

export const RelatedSNEnum: Record<string, string[]> = {
    CMDB: ['CPU', 'BOARD', 'MEMORY', 'DISK', 'NIC', 'GPU', 'POWER'],

};
