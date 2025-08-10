export const isTeamOwner = (user: any, team: any): boolean => {
  return user?.id === team?.ownerId || user?.id === team?.owner?.id;
};

export const canManageMembers = (user: any, team: any): boolean => {
  return isTeamOwner(user, team);
};

export const formatMemberRole = (role: string): string => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export const getMemberDisplayName = (member: any): string => {
  if (member.user?.firstName && member.user?.lastName) {
    return `${member.user.firstName} ${member.user.lastName}`;
  }
  if (member.user?.firstName) {
    return member.user.firstName;
  }
  return member.user?.username || member.username || 'Unknown';
};

export const sortMembersByRole = (members: any[]): any[] => {
  const roleOrder = { owner: 0, admin: 1, member: 2 };
  return [...members].sort((a, b) => {
    const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
    const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
    return aOrder - bOrder;
  });
};
