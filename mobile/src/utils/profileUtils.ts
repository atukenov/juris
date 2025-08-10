export const formatJoinDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const getProfileDisplayName = (user: any): string => {
  if (user?.firstName && user?.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user?.firstName) {
    return user.firstName;
  }
  return user?.username || 'Unknown User';
};

export const formatStats = (stats: any) => {
  return {
    territories: stats?.territoriesCaptures || 0,
    runs: stats?.totalRuns || 0,
    teamJoinDate: stats?.teamJoinDate ? formatJoinDate(stats.teamJoinDate) : null,
  };
};

export const validateProfileForm = (formData: any) => {
  const errors: { [key: string]: string } = {};
  
  if (!formData.username?.trim()) {
    errors.username = 'Username is required';
  }
  
  if (!formData.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const getInitials = (user: any): string => {
  if (user?.firstName && user?.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user?.firstName) {
    return user.firstName[0].toUpperCase();
  }
  if (user?.username) {
    return user.username[0].toUpperCase();
  }
  return 'U';
};
