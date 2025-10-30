// LifeSync Pro - Personal Wellness Dashboard Application
// React Application with Authentication and Enhanced Features

const { useState, useEffect, useRef, createContext, useContext } = React;

// ===== UTILITY FUNCTIONS =====

// In-memory storage (simulates backend database)
const memoryStore = {};

// Custom Hook for In-Memory Storage (replaces localStorage)
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    return memoryStore[key] !== undefined ? memoryStore[key] : initialValue;
  });

  const setValue = (value) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    memoryStore[key] = valueToStore;
  };

  return [storedValue, setValue];
};

// Get formatted date
const getFormattedDate = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

// Get time of day greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// ===== AUTHENTICATION CONTEXT =====

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useLocalStorage('currentUser', null);
  const [users, setUsers] = useLocalStorage('users', [
    {
      id: 'user1',
      username: 'user1',
      password: 'password123',
      name: 'User One',
      createdAt: '2025-10-25',
      preferences: {
        waterGoal: 2000,
        reminderInterval: 3600,
        quietHoursStart: 22,
        quietHoursEnd: 8,
        theme: 'light'
      },
      stats: {
        daysActive: ['2025-10-25', '2025-10-26', '2025-10-27', '2025-10-28', '2025-10-29'],
        currentStreak: 5,
        longestStreak: 5,
        totalTasksCompleted: 12,
        totalPomodoroSessions: 8,
        totalJournalEntries: 6
      }
    },
    {
      id: 'user2',
      username: 'user2',
      password: 'demo123',
      name: 'User Two',
      createdAt: '2025-10-28',
      preferences: {
        waterGoal: 2000,
        reminderInterval: 3600,
        quietHoursStart: 22,
        quietHoursEnd: 8,
        theme: 'light'
      },
      stats: {
        daysActive: ['2025-10-28', '2025-10-29', '2025-10-30'],
        currentStreak: 3,
        longestStreak: 3,
        totalTasksCompleted: 5,
        totalPomodoroSessions: 3,
        totalJournalEntries: 2
      }
    },
    {
      id: 'admin',
      username: 'admin',
      password: 'admin123',
      name: 'Admin User',
      createdAt: '2025-10-15',
      preferences: {
        waterGoal: 2000,
        reminderInterval: 3600,
        quietHoursStart: 22,
        quietHoursEnd: 8,
        theme: 'light'
      },
      stats: {
        daysActive: ['2025-10-15', '2025-10-16', '2025-10-17', '2025-10-18', '2025-10-19', '2025-10-20', '2025-10-21', '2025-10-22', '2025-10-23', '2025-10-24'],
        currentStreak: 10,
        longestStreak: 10,
        totalTasksCompleted: 25,
        totalPomodoroSessions: 20,
        totalJournalEntries: 15
      }
    }
  ]);

  const login = (username, password) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      return { success: true };
    }
    return { success: false, message: 'Invalid username or password' };
  };

  const signup = (userData) => {
    const existingUser = users.find(u => u.username === userData.username);
    if (existingUser) {
      return { success: false, message: 'Username already exists' };
    }
    const newUser = {
      id: Date.now().toString(),
      ...userData,
      createdAt: new Date().toISOString().split('T')[0],
      preferences: {
        waterGoal: 2000,
        reminderInterval: 3600,
        quietHoursStart: 22,
        quietHoursEnd: 8,
        theme: 'light'
      },
      stats: {
        daysActive: [],
        currentStreak: 0,
        longestStreak: 0,
        totalTasksCompleted: 0,
        totalPomodoroSessions: 0,
        totalJournalEntries: 0
      }
    };
    setUsers([...users, newUser]);
    setCurrentUser(newUser);
    return { success: true, user: newUser };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const updateUser = (updates) => {
    const updatedUser = { ...currentUser, ...updates };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
  };

  const deleteAccount = () => {
    const userId = currentUser.id;
    // Remove user from users list
    setUsers(users.filter(u => u.id !== userId));
    // Clear all user data from memory
    Object.keys(memoryStore).forEach(key => {
      if (key.includes(`user_${userId}`)) {
        delete memoryStore[key];
      }
    });
    // Logout
    setCurrentUser(null);
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, signup, logout, updateUser, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// ===== GLOBAL STATE CONTEXT =====

const AppContext = createContext();

const AppProvider = ({ children }) => {
  const { currentUser, updateUser } = useAuth();
  const [currentModule, setCurrentModule] = useState('dashboard');
  const userKey = currentUser ? `user_${currentUser.id}` : 'guest';
  
  const [tasks, setTasks] = useLocalStorage(`${userKey}_tasks`, []);
  const [journalEntries, setJournalEntries] = useLocalStorage(`${userKey}_journalEntries`, []);
  const [journalDrafts, setJournalDrafts] = useLocalStorage(`${userKey}_journalDrafts`, []);
  const [waterLog, setWaterLog] = useLocalStorage(`${userKey}_waterLog`, { today: 0, date: getFormattedDate(), streak: 0 });
  const [pomodoroStats, setPomodoroStats] = useLocalStorage(`${userKey}_pomodoroStats`, { sessionsToday: 0, date: getFormattedDate() });
  const [dailyProgress, setDailyProgress] = useLocalStorage(`${userKey}_dailyProgress`, []);
  const [reminderEnabled, setReminderEnabled] = useLocalStorage(`${userKey}_reminderEnabled`, true);
  const [lastReminder, setLastReminder] = useState(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Track daily usage
  useEffect(() => {
    if (currentUser) {
      const today = getFormattedDate();
      const stats = currentUser.stats || {};
      const daysActive = stats.daysActive || [];
      
      if (!daysActive.includes(today)) {
        const newDaysActive = [...daysActive, today];
        const sortedDays = newDaysActive.sort();
        
        // Calculate streak
        let currentStreak = 1;
        for (let i = sortedDays.length - 2; i >= 0; i--) {
          const prevDate = new Date(sortedDays[i]);
          const currDate = new Date(sortedDays[i + 1]);
          const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
        
        const longestStreak = Math.max(stats.longestStreak || 0, currentStreak);
        
        updateUser({
          stats: {
            ...stats,
            daysActive: newDaysActive,
            currentStreak,
            longestStreak
          }
        });
      }
    }
  }, [currentUser?.id]);

  // Reset daily data if new day
  useEffect(() => {
    const today = getFormattedDate();
    
    if (waterLog.date !== today) {
      const waterGoal = currentUser?.preferences?.waterGoal || 2000;
      const newStreak = waterLog.today >= waterGoal ? waterLog.streak + 1 : 0;
      setWaterLog({ today: 0, date: today, streak: newStreak });
    }
    
    if (pomodoroStats.date !== today) {
      setPomodoroStats({ sessionsToday: 0, date: today });
    }
  }, [currentUser]);

  // Hourly water reminder
  useEffect(() => {
    if (!currentUser || !reminderEnabled) return;

    const checkReminder = () => {
      const now = new Date();
      const hour = now.getHours();
      const quietStart = currentUser.preferences?.quietHoursStart || 22;
      const quietEnd = currentUser.preferences?.quietHoursEnd || 8;
      
      // Check if within active hours (8 AM - 10 PM)
      if (hour >= quietEnd && hour < quietStart) {
        const waterGoal = currentUser.preferences?.waterGoal || 2000;
        const currentAmount = waterLog.today;
        
        // Only show reminder if goal not reached
        if (currentAmount < waterGoal) {
          const lastReminderTime = lastReminder ? new Date(lastReminder) : null;
          const hoursSinceLastReminder = lastReminderTime 
            ? (now - lastReminderTime) / (1000 * 60 * 60) 
            : 999;
          
          // Show reminder every hour
          if (hoursSinceLastReminder >= 1) {
            setShowReminderModal(true);
            setLastReminder(now.toISOString());
            console.log(`[SMS Reminder] Sending to ${currentUser.phone}: Time to drink water!`);
            console.log(`[Email Reminder] Sending to ${currentUser.email}: Time to drink water!`);
          }
        }
      }
    };

    // Check immediately and then every hour
    checkReminder();
    const interval = setInterval(checkReminder, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser, reminderEnabled, waterLog.today, lastReminder]);

  // Save daily progress
  useEffect(() => {
    if (currentUser) {
      const today = getFormattedDate();
      const todayProgress = {
        date: today,
        tasksCompleted: tasks.filter(t => t.completed).length,
        tasksTotal: tasks.length,
        pomodoroSessions: pomodoroStats.sessionsToday,
        waterIntake: waterLog.today,
        waterGoal: currentUser.preferences?.waterGoal || 2000,
        journalEntries: journalEntries.filter(e => e.date === today).length
      };
      
      const existingIndex = dailyProgress.findIndex(p => p.date === today);
      if (existingIndex >= 0) {
        const newProgress = [...dailyProgress];
        newProgress[existingIndex] = todayProgress;
        setDailyProgress(newProgress);
      } else {
        setDailyProgress([...dailyProgress, todayProgress]);
      }
    }
  }, [tasks, pomodoroStats.sessionsToday, waterLog.today, journalEntries.length]);

  const value = {
    currentModule,
    setCurrentModule,
    tasks,
    setTasks,
    journalEntries,
    setJournalEntries,
    journalDrafts,
    setJournalDrafts,
    waterLog,
    setWaterLog,
    pomodoroStats,
    setPomodoroStats,
    dailyProgress,
    reminderEnabled,
    setReminderEnabled,
    showReminderModal,
    setShowReminderModal
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

const useApp = () => useContext(AppContext);

// ===== MOTIVATIONAL QUOTES =====

const motivationalQuotes = [
  "The journey of a thousand miles begins with one step.",
  "Progress, not perfection, is the goal.",
  "Every moment is a fresh beginning.",
  "You are capable of amazing things.",
  "Balance is not better time management, but better boundary management.",
  "Small steps every day lead to big changes.",
  "Your only limit is you.",
  "Believe you can and you're halfway there."
];

const mindfulnessPrompts = [
  "What are you grateful for today?",
  "What made you smile today?",
  "What challenged you today and how did you handle it?",
  "What is one thing you learned about yourself today?",
  "How did you practice kindness today?"
];

// ===== LOGIN/SIGNUP PAGE =====

const LoginPage = () => {
  const { signup, login } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.username.trim()) {
      setError('Please fill all fields');
      return;
    }
    if (!formData.password) {
      setError('Please fill all fields');
      return;
    }

    if (isSignup) {
      // Signup validation
      if (!formData.name.trim()) {
        setError('Please fill all fields');
        return;
      }
      if (formData.username.length < 4) {
        setError('Username must be at least 4 characters');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords don\'t match');
        return;
      }

      const result = signup({
        username: formData.username,
        password: formData.password,
        name: formData.name
      });

      if (!result.success) {
        setError(result.message);
      } else {
        setSuccess('Account created! Welcome to LifeSync');
      }
    } else {
      // Login
      const result = login(formData.username, formData.password);
      if (!result.success) {
        setError(result.message);
      } else {
        setSuccess('Logged in successfully!');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="login-container glass-card rounded-2xl p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            LifeSync Pro
          </h1>
          <p className="text-gray-600">Your Personal Wellness Dashboard</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setIsSignup(false);
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              !isSignup ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => {
              setIsSignup(true);
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              isSignup ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="login-input w-full px-4 py-3 rounded-lg"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="login-input w-full px-4 py-3 rounded-lg"
              placeholder="Enter username"
            />
            {isSignup && <p className="text-xs text-gray-500 mt-1">Min 4 characters</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="login-input w-full px-4 py-3 rounded-lg"
              placeholder="Enter password"
            />
            {isSignup && <p className="text-xs text-gray-500 mt-1">Min 6 characters</p>}
          </div>

          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="login-input w-full px-4 py-3 rounded-lg"
                placeholder="Confirm password"
              />
              <p className="text-xs text-gray-500 mt-1">Must match password</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            {isSignup ? '🚀 Create Account' : '🔓 Login'}
          </button>
        </form>

        {!isSignup ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Don't have an account?</p>
            <button
              onClick={() => setIsSignup(true)}
              className="text-blue-600 font-semibold hover:text-blue-700"
            >
              Create Account
            </button>
            
            <div className="mt-6 pt-6 border-t border-gray-300">
              <p className="text-xs text-gray-600 mb-2">Demo Credentials:</p>
              <div className="text-xs text-left bg-blue-50 p-3 rounded space-y-1">
                <p className="font-semibold">Username: user1</p>
                <p className="font-semibold">Password: password123</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Already have an account?</p>
            <button
              onClick={() => setIsSignup(false)}
              className="text-blue-600 font-semibold hover:text-blue-700"
            >
              Login Here
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== NAVIGATION COMPONENT =====

const Navigation = () => {
  const { currentUser, logout } = useAuth();
  const { currentModule, setCurrentModule } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'tasks', label: 'Tasks', icon: '✓' },
    { id: 'pomodoro', label: 'Pomodoro', icon: '🍅' },
    { id: 'water', label: 'Water', icon: '💧' },
    { id: 'journal', label: 'Journal', icon: '✍️' },
    { id: 'meditation', label: 'Meditation', icon: '🧘' },
    { id: 'progress', label: 'Progress', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav className="glass-card rounded-2xl p-4 mb-6 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
            {currentUser?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{currentUser?.name}</p>
            <p className="text-xs text-gray-600">@{currentUser?.username}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium"
        >
          🚪 Logout
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2 md:gap-4">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentModule(item.id)}
            className={`nav-item px-4 py-2 rounded-lg font-medium transition-all ${
              currentModule === item.id
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white active'
                : 'bg-white hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="mr-2">{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// ===== WATER REMINDER MODAL =====

const WaterReminderModal = () => {
  const { currentUser } = useAuth();
  const { waterLog, showReminderModal, setShowReminderModal, setWaterLog } = useApp();
  const waterGoal = currentUser?.preferences?.waterGoal || 2000;
  const remaining = Math.max(0, waterGoal - waterLog.today);
  const percentage = Math.round((waterLog.today / waterGoal) * 100);

  const getMessage = () => {
    if (percentage < 30) {
      return `Time to drink water! ☀️ You've had ${waterLog.today}ml, need ${remaining}ml more!`;
    } else if (percentage < 70) {
      return `Keep it up! 💧 You're ${percentage}% to your goal!`;
    } else if (percentage < 100) {
      return `Almost there! 🎯 Just ${remaining}ml to reach your goal!`;
    }
    return '🎉 Goal reached! Amazing work staying hydrated!';
  };

  const addWater = () => {
    setWaterLog({ ...waterLog, today: waterLog.today + 250 });
    setShowReminderModal(false);
  };

  if (!showReminderModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="reminder-modal glass-card rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">💧</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Water Reminder</h3>
          <p className="text-lg text-gray-700 mb-6">{getMessage()}</p>
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-teal-500 h-4 rounded-full transition-all"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">{waterLog.today}ml / {waterGoal}ml</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addWater}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              ✓ Drink 250ml
            </button>
            <button
              onClick={() => setShowReminderModal(false)}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== DASHBOARD MODULE =====

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { tasks, waterLog, pomodoroStats, journalEntries } = useApp();
  const [quote, setQuote] = useState('');

  useEffect(() => {
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setQuote(randomQuote);
  }, []);

  const completedTasks = tasks.filter(t => t.completed).length;
  const waterProgress = Math.round((waterLog.today / 2000) * 100);
  const todayEntries = journalEntries.filter(e => e.date === getFormattedDate()).length;

  const daysActive = currentUser?.stats?.daysActive?.length || 0;
  const currentStreak = currentUser?.stats?.currentStreak || 0;
  const longestStreak = currentUser?.stats?.longestStreak || 0;

  return (
    <div className="fade-in space-y-6">
      {/* Welcome Header */}
      <div className="glass-card rounded-2xl p-8 shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          {getGreeting()}, {currentUser?.name}! 💫
        </h1>
        <p className="text-lg text-gray-600">Let's balance your day with mindfulness and productivity</p>
        <div className="mt-4 flex gap-4 flex-wrap">
          <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white px-4 py-2 rounded-full font-semibold">
            🔥 {currentStreak} day streak
          </div>
          <div className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-4 py-2 rounded-full font-semibold">
            📅 {daysActive} days active
          </div>
          <div className="bg-gradient-to-r from-green-400 to-teal-500 text-white px-4 py-2 rounded-full font-semibold">
            🏆 {longestStreak} longest streak
          </div>
        </div>
      </div>

      {/* Daily Quote */}
      <div className="quote-card rounded-2xl p-6 shadow-lg">
        <p className="text-xl italic text-gray-700">" {quote} "</p>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasks Card */}
        <div className="glass-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Tasks</h3>
            <span className="text-3xl">✓</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{completedTasks}/{tasks.length}</p>
          <p className="text-sm text-gray-600 mt-2">Completed today</p>
        </div>

        {/* Pomodoro Card */}
        <div className="glass-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Focus</h3>
            <span className="text-3xl">🍅</span>
          </div>
          <p className="text-3xl font-bold text-red-500">{pomodoroStats.sessionsToday}</p>
          <p className="text-sm text-gray-600 mt-2">Sessions today</p>
        </div>

        {/* Water Card */}
        <div className="glass-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Hydration</h3>
            <span className="text-3xl">💧</span>
          </div>
          <p className="text-3xl font-bold text-blue-500">{waterProgress}%</p>
          <p className="text-sm text-gray-600 mt-2">{waterLog.today}ml / 2000ml</p>
        </div>

        {/* Journal Card */}
        <div className="glass-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Journal</h3>
            <span className="text-3xl">✍️</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">{todayEntries}</p>
          <p className="text-sm text-gray-600 mt-2">Entries today</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="glass-card rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Wellness Streak</h2>
        <div className="flex flex-wrap gap-4">
          <div className="streak-badge">
            🔥 {waterLog.streak} day water streak
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full font-semibold">
            📝 {journalEntries.length} total journal entries
          </div>
          <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-full font-semibold">
            ✅ {completedTasks} tasks completed
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== TASKS MODULE =====

const Tasks = () => {
  const { tasks, setTasks } = useApp();
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('medium');
  const [filter, setFilter] = useState('all');

  const addTask = (e) => {
    e.preventDefault();
    if (newTask.trim()) {
      const task = {
        id: Date.now(),
        text: newTask,
        completed: false,
        priority: priority,
        createdAt: getFormattedDate()
      };
      setTasks([...tasks, task]);
      setNewTask('');
      setPriority('medium');
    }
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.completed;
    if (filter === 'pending') return !task.completed;
    return true;
  });

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Task Manager</h2>
        <p className="text-gray-600">Organize your day with clarity and focus</p>
      </div>

      {/* Task Stats */}
      <div className="glass-card rounded-xl p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{completedCount} / {tasks.length}</p>
            <p className="text-sm text-gray-600">Tasks completed</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'completed' ? 'bg-green-500 text-white' : 'bg-white text-gray-700'}`}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={addTask} className="glass-card rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-all"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-all"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <button
            type="submit"
            className="btn-hover px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold"
          >
            Add Task
          </button>
        </div>
      </form>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="glass-card rounded-xl p-8 shadow-lg text-center">
            <p className="text-gray-500 text-lg">No tasks yet. Add one to get started! 🚀</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="task-item glass-card rounded-xl p-4 shadow-lg slide-in">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  className="w-5 h-5 cursor-pointer"
                />
                <div className="flex-1">
                  <p className={`text-lg ${task.completed ? 'task-complete text-gray-500' : 'text-gray-800 font-medium'}`}>
                    {task.text}
                  </p>
                  <p className="text-sm text-gray-500">Created: {task.createdAt}</p>
                </div>
                <span className={`priority-${task.priority} px-3 py-1 rounded-full text-xs font-semibold`}>
                  {task.priority.toUpperCase()}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ===== POMODORO MODULE =====

const Pomodoro = () => {
  const { pomodoroStats, setPomodoroStats } = useApp();
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus'); // focus, shortBreak, longBreak
  const [session, setSession] = useState(1);
  const intervalRef = useRef(null);

  const modes = {
    focus: { duration: 25 * 60, label: 'Focus Time', color: 'from-red-500 to-orange-500' },
    shortBreak: { duration: 5 * 60, label: 'Short Break', color: 'from-green-500 to-teal-500' },
    longBreak: { duration: 15 * 60, label: 'Long Break', color: 'from-blue-500 to-purple-500' }
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    setIsActive(false);
    alert(`${modes[mode].label} complete! 🎉`);
    
    if (mode === 'focus') {
      const newStats = { ...pomodoroStats, sessionsToday: pomodoroStats.sessionsToday + 1 };
      setPomodoroStats(newStats);
      
      if (session === 4) {
        setMode('longBreak');
        setSession(1);
      } else {
        setMode('shortBreak');
        setSession(session + 1);
      }
    } else {
      setMode('focus');
    }
    
    setTimeLeft(modes[mode === 'focus' ? (session === 4 ? 'longBreak' : 'shortBreak') : 'focus'].duration);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(modes[mode].duration);
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    setTimeLeft(modes[newMode].duration);
    setIsActive(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((modes[mode].duration - timeLeft) / modes[mode].duration) * 100;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Pomodoro Timer</h2>
        <p className="text-gray-600">Focus deeply with the Pomodoro Technique</p>
      </div>

      {/* Stats */}
      <div className="glass-card rounded-xl p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-2xl font-bold text-red-500">{pomodoroStats.sessionsToday}</p>
            <p className="text-sm text-gray-600">Sessions completed today</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-700">Session {session} of 4</p>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="glass-card rounded-xl p-4 shadow-lg">
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => changeMode('focus')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${mode === 'focus' ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white' : 'bg-white text-gray-700'}`}
          >
            🍅 Focus
          </button>
          <button
            onClick={() => changeMode('shortBreak')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${mode === 'shortBreak' ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white' : 'bg-white text-gray-700'}`}
          >
            ☕ Short Break
          </button>
          <button
            onClick={() => changeMode('longBreak')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${mode === 'longBreak' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-white text-gray-700'}`}
          >
            🌙 Long Break
          </button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="glass-card rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col items-center justify-center">
          <h3 className="text-2xl font-semibold text-gray-700 mb-6">{modes[mode].label}</h3>
          
          {/* Circular Progress */}
          <div className="relative mb-8">
            <svg width="300" height="300" className="transform -rotate-90">
              <circle
                cx="150"
                cy="150"
                r="120"
                stroke="rgba(59, 130, 246, 0.2)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="150"
                cy="150"
                r="120"
                stroke="url(#gradient)"
                strokeWidth="12"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="circular-progress"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="timer-display text-gray-800">{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-4">
            <button
              onClick={toggleTimer}
              className={`btn-hover px-8 py-4 rounded-xl font-semibold text-white text-lg bg-gradient-to-r ${modes[mode].color}`}
            >
              {isActive ? '⏸ Pause' : '▶ Start'}
            </button>
            <button
              onClick={resetTimer}
              className="btn-hover px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold text-lg"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== WATER TRACKER MODULE =====

const WaterTracker = () => {
  const { waterLog, setWaterLog } = useApp();
  const [showCelebration, setShowCelebration] = useState(false);

  const addWater = () => {
    const newAmount = waterLog.today + 250;
    setWaterLog({ ...waterLog, today: newAmount });
    
    if (newAmount >= 2000 && waterLog.today < 2000) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  };

  const resetWater = () => {
    if (confirm('Reset today\'s water intake?')) {
      setWaterLog({ ...waterLog, today: 0 });
    }
  };

  const progress = Math.min((waterLog.today / 2000) * 100, 100);
  const glasses = Math.floor(waterLog.today / 250);

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Water Tracker 💧</h2>
        <p className="text-gray-600">Stay hydrated, stay healthy</p>
      </div>

      {/* Streak */}
      {waterLog.streak > 0 && (
        <div className="glass-card rounded-xl p-4 shadow-lg text-center">
          <p className="text-3xl font-bold text-orange-500">🔥 {waterLog.streak} Day Streak!</p>
          <p className="text-gray-600 mt-2">Keep up the great work!</p>
        </div>
      )}

      {/* Celebration */}
      {showCelebration && (
        <div className="glass-card rounded-xl p-6 shadow-lg text-center celebrate bg-gradient-to-r from-blue-500 to-teal-500 text-white">
          <p className="text-3xl font-bold mb-2">🎉 Goal Reached! 🎉</p>
          <p className="text-lg">You've hit your daily water goal!</p>
        </div>
      )}

      {/* Progress Circle */}
      <div className="glass-card rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col items-center justify-center">
          <div className="relative mb-6">
            <svg width="280" height="280" className="transform -rotate-90">
              <circle
                cx="140"
                cy="140"
                r="110"
                stroke="rgba(59, 130, 246, 0.2)"
                strokeWidth="20"
                fill="none"
              />
              <circle
                cx="140"
                cy="140"
                r="110"
                stroke="url(#waterGradient)"
                strokeWidth="20"
                fill="none"
                strokeDasharray={2 * Math.PI * 110}
                strokeDashoffset={2 * Math.PI * 110 * (1 - progress / 100)}
                className="circular-progress"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-blue-600">{Math.round(progress)}%</span>
              <span className="text-lg text-gray-600 mt-2">{waterLog.today}ml</span>
              <span className="text-sm text-gray-500">of 2000ml</span>
            </div>
          </div>

          {/* Glass Count */}
          <div className="mb-6">
            <p className="text-2xl font-semibold text-gray-700 text-center mb-2">🥤 {glasses} Glasses</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {[...Array(8)].map((_, i) => (
                <span key={i} className="text-3xl" style={{ opacity: i < glasses ? 1 : 0.3 }}>
                  💧
                </span>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={addWater}
              className="btn-hover px-8 py-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-xl font-semibold text-lg"
            >
              + 250ml
            </button>
            <button
              onClick={resetWater}
              className="btn-hover px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold text-lg"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="glass-card rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">💡 Hydration Tips</h3>
        <ul className="space-y-2 text-gray-700">
          <li>• Start your day with a glass of water</li>
          <li>• Drink water before meals</li>
          <li>• Keep a water bottle nearby</li>
          <li>• Set reminders throughout the day</li>
        </ul>
      </div>
    </div>
  );
};

// ===== JOURNAL MODULE WITH AUTO-SAVE =====

const Journal = () => {
  const { currentUser } = useAuth();
  const { journalEntries, setJournalEntries, journalDrafts, setJournalDrafts } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [draftStatus, setDraftStatus] = useState(''); // 'saving', 'saved'
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    const randomPrompt = mindfulnessPrompts[Math.floor(Math.random() * mindfulnessPrompts.length)];
    setPrompt(randomPrompt);
  }, []);

  const moods = [
    { emoji: '😊', label: 'Happy', value: 'happy' },
    { emoji: '😌', label: 'Calm', value: 'calm' },
    { emoji: '😢', label: 'Sad', value: 'sad' },
    { emoji: '😰', label: 'Anxious', value: 'anxious' },
    { emoji: '😫', label: 'Stressed', value: 'stressed' }
  ];

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (content.trim() && showForm) {
      setDraftStatus('saving');
      autoSaveTimerRef.current = setTimeout(() => {
        const draftId = currentDraftId || `draft_${Date.now()}`;
        const draft = {
          id: draftId,
          userId: currentUser?.id,
          title: title || 'Untitled Entry',
          content,
          mood,
          status: 'draft',
          lastSaved: new Date().toISOString(),
          created: currentDraftId ? journalDrafts.find(d => d.id === draftId)?.created : new Date().toISOString()
        };
        
        if (currentDraftId) {
          setJournalDrafts(journalDrafts.map(d => d.id === draftId ? draft : d));
        } else {
          setJournalDrafts([draft, ...journalDrafts]);
          setCurrentDraftId(draftId);
        }
        
        setDraftStatus('saved');
        setTimeout(() => setDraftStatus(''), 2000);
      }, 30000); // 30 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, title, mood]);

  const saveEntry = (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      alert('Please write something in your journal!');
      return;
    }

    if (editingId) {
      setJournalEntries(journalEntries.map(entry =>
        entry.id === editingId
          ? { ...entry, title, content, mood, date: getFormattedDate(), status: 'published' }
          : entry
      ));
      setEditingId(null);
    } else {
      const entry = {
        id: Date.now(),
        date: getFormattedDate(),
        title: title || 'Untitled Entry',
        content,
        mood,
        status: 'published'
      };
      setJournalEntries([entry, ...journalEntries]);
    }

    // Remove draft if exists
    if (currentDraftId) {
      setJournalDrafts(journalDrafts.filter(d => d.id !== currentDraftId));
      setCurrentDraftId(null);
    }

    setTitle('');
    setContent('');
    setMood('');
    setShowForm(false);
    setDraftStatus('');
  };

  const loadDraft = (draft) => {
    setTitle(draft.title);
    setContent(draft.content);
    setMood(draft.mood);
    setCurrentDraftId(draft.id);
    setShowForm(true);
  };

  const deleteDraft = (draftId) => {
    if (confirm('Delete this draft?')) {
      setJournalDrafts(journalDrafts.filter(d => d.id !== draftId));
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
      }
    }
  };

  const editEntry = (entry) => {
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood);
    setEditingId(entry.id);
    setShowForm(true);
  };

  const deleteEntry = (id) => {
    if (confirm('Delete this journal entry?')) {
      setJournalEntries(journalEntries.filter(entry => entry.id !== id));
    }
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Mental Health Journal ✍️</h2>
        <p className="text-gray-600">Reflect on your thoughts and feelings</p>
      </div>

      {/* Mindfulness Prompt */}
      <div className="quote-card rounded-xl p-4 shadow-lg">
        <p className="text-lg italic text-gray-700">💭 {prompt}</p>
      </div>

      {/* New Entry Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full btn-hover px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg"
        >
          ✍️ Write New Entry
        </button>
      )}

      {/* Drafts Section */}
      {journalDrafts.length > 0 && !showForm && (
        <div className="glass-card rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📝 Saved Drafts ({journalDrafts.length})</h3>
          <div className="space-y-2">
            {journalDrafts.map(draft => (
              <div key={draft.id} className="bg-white bg-opacity-50 rounded-lg p-4 flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{draft.title}</h4>
                  <p className="text-sm text-gray-600 truncate">{draft.content.substring(0, 100)}...</p>
                  <p className="text-xs text-gray-500 mt-1">Last saved: {new Date(draft.lastSaved).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadDraft(draft)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => deleteDraft(draft.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry Form */}
      {showForm && (
        <form onSubmit={saveEntry} className="glass-card rounded-xl p-6 shadow-lg space-y-4">
          {draftStatus && (
            <div className={`text-sm font-medium ${
              draftStatus === 'saving' ? 'text-blue-600' : 'text-green-600'
            }`}>
              {draftStatus === 'saving' ? '💾 Saving draft...' : '✓ Draft saved'}
            </div>
          )}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Entry title (optional)"
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
          />

          {/* Mood Selector */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">How are you feeling?</p>
            <div className="flex gap-4 justify-center">
              {moods.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`mood-btn ${mood === m.value ? 'selected' : ''}`}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your thoughts here..."
            rows="8"
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all resize-none"
          />

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 btn-hover px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold"
            >
              {editingId ? '💾 Update Entry' : '💾 Save Entry'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setTitle('');
                setContent('');
                setMood('');
                setDraftStatus('');
                setCurrentDraftId(null);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Previous Entries */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-800">Previous Entries</h3>
        {journalEntries.length === 0 ? (
          <div className="glass-card rounded-xl p-8 shadow-lg text-center">
            <p className="text-gray-500 text-lg">No journal entries yet. Start writing! ✨</p>
          </div>
        ) : (
          journalEntries.map(entry => (
            <div key={entry.id} className="journal-entry glass-card rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-800">{entry.title}</h4>
                  <p className="text-sm text-gray-600">{entry.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  {entry.mood && (
                    <span className="text-3xl">
                      {moods.find(m => m.value === entry.mood)?.emoji}
                    </span>
                  )}
                  <button
                    onClick={() => editEntry(entry)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{entry.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ===== MOTIVATIONAL QUOTE SCREEN =====

const QuoteScreen = ({ userName, onComplete }) => {
  const quotes = [
    "Balance is not better time management, it's better boundary management.",
    "Progress, not perfection, is the goal.",
    "Your body is a temple, but only if you treat it right.",
    "Happiness is found when you stop comparing yourself to other people.",
    "The greatest wealth is health.",
    "Take care of your body. It's the only place you have to live.",
    "Self-care is not selfish.",
    "You are capable of amazing things.",
    "Drink water, be happy, live fully.",
    "Every moment is a fresh beginning.",
    "Small steps lead to big changes.",
    "You've got this! 💪",
    "Your wellness journey starts now!",
    "Breathe. You're doing great.",
    "Mind, body, and soul in harmony.",
    "Success is a journey, not a destination."
  ];

  const [currentQuote] = useState(quotes[Math.floor(Math.random() * quotes.length)]);

  useEffect(() => {
    // Auto-transition after 4 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="quote-modal">
      <div className="quote-content">
        <h1 className="text-5xl font-bold mb-6">Welcome back, {userName}! ✨</h1>
        <p className="quote-text">"{currentQuote}"</p>
        <p className="text-xl mb-8">Let's start your wellness journey! 🌟</p>
        <button
          onClick={onComplete}
          className="px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-opacity-90 transition-all"
        >
          Continue to Dashboard →
        </button>
      </div>
    </div>
  );
};

// ===== PROGRESS TRACKER MODULE =====

const ProgressTracker = () => {
  const { currentUser } = useAuth();
  const { dailyProgress, tasks, pomodoroStats, waterLog, journalEntries } = useApp();
  const [viewMode, setViewMode] = useState('week'); // 'week', 'month'

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(getFormattedDate(date));
    }
    return days;
  };

  const getLast30Days = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(getFormattedDate(date));
    }
    return days;
  };

  const getProgressForDate = (date) => {
    return dailyProgress.find(p => p.date === date) || {
      date,
      tasksCompleted: 0,
      tasksTotal: 0,
      pomodoroSessions: 0,
      waterIntake: 0,
      waterGoal: currentUser?.preferences?.waterGoal || 2000,
      journalEntries: 0
    };
  };

  const days = viewMode === 'week' ? getLast7Days() : getLast30Days();
  const progressData = days.map(date => getProgressForDate(date));

  const maxTasks = Math.max(...progressData.map(p => p.tasksTotal), 1);
  const maxPomodoro = Math.max(...progressData.map(p => p.pomodoroSessions), 1);

  // Today's stats
  const today = getFormattedDate();
  const todayData = getProgressForDate(today);
  const taskCompletion = todayData.tasksTotal > 0 ? Math.round((todayData.tasksCompleted / todayData.tasksTotal) * 100) : 0;
  const waterCompletion = Math.round((todayData.waterIntake / todayData.waterGoal) * 100);

  // Calculate weekly averages
  const weekData = getLast7Days().map(date => getProgressForDate(date));
  const avgTasks = Math.round(weekData.reduce((sum, d) => sum + d.tasksCompleted, 0) / 7);
  const avgPomodoro = Math.round(weekData.reduce((sum, d) => sum + d.pomodoroSessions, 0) / 7);
  const avgWater = Math.round(weekData.reduce((sum, d) => sum + d.waterIntake, 0) / 7);

  // Activity calendar for current month
  const daysActive = currentUser?.stats?.daysActive || [];
  const isActiveDay = (date) => daysActive.includes(date);

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Progress Tracker 📊</h2>
        <p className="text-gray-600">Track your daily improvements and achievements</p>
      </div>

      {/* Today's Summary */}
      <div className="progress-cards-container">
        <div className="glass-card rounded-xl p-6 shadow-lg progress-summary-card">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">📊 Today's Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Current Streak</p>
              <p className="text-2xl font-bold text-orange-500">🔥 Day {currentUser?.stats?.currentStreak || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Sessions Today</p>
              <p className="text-2xl font-bold text-green-600">{pomodoroStats.sessionsToday}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Goals Completed</p>
              <p className="text-2xl font-bold text-purple-600">{todayData.tasksCompleted}/{todayData.tasksTotal}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Days Active</p>
              <p className="text-2xl font-bold text-yellow-600">{currentUser?.stats?.daysActive?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 shadow-lg progress-card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Tasks Completed</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-6 mb-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ width: `${taskCompletion}%` }}
                >
                  {taskCompletion}%
                </div>
              </div>
              <p className="text-gray-600">{todayData.tasksCompleted} of {todayData.tasksTotal} tasks</p>
            </div>
            <div className="w-24 h-24 relative flex-shrink-0">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="8" fill="none" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - taskCompletion / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-blue-600">{taskCompletion}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 shadow-lg progress-card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🍅 Pomodoro Sessions</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-6 mb-2">
                <div
                  className="bg-gradient-to-r from-red-500 to-red-600 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ width: `${Math.min((todayData.pomodoroSessions / 4) * 100, 100)}%` }}
                >
                  {Math.round((todayData.pomodoroSessions / 4) * 100)}%
                </div>
              </div>
              <p className="text-gray-600">{todayData.pomodoroSessions} of 4 sessions</p>
            </div>
            <div className="w-24 h-24 relative flex-shrink-0">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="rgba(239, 68, 68, 0.2)" strokeWidth="8" fill="none" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#EF4444"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(todayData.pomodoroSessions / 4, 1))}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-red-600">{todayData.pomodoroSessions}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 shadow-lg progress-card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">💧 Water Intake</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-6 mb-2">
                <div
                  className="bg-gradient-to-r from-blue-400 to-teal-500 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ width: `${Math.min(waterCompletion, 100)}%` }}
                >
                  {waterCompletion}%
                </div>
              </div>
              <p className="text-gray-600">{todayData.waterIntake}ml of {todayData.waterGoal}ml</p>
            </div>
            <div className="w-24 h-24 relative flex-shrink-0">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="8" fill="none" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#10B981"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - waterCompletion / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-green-600">{waterCompletion}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 shadow-lg progress-card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">✍️ Journal Entries</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-3xl font-bold text-purple-600 mb-2">{todayData.journalEntries}</p>
              <p className="text-gray-600">entries today</p>
            </div>
            <div className="w-24 h-24 relative flex-shrink-0">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="rgba(139, 92, 246, 0.2)" strokeWidth="8" fill="none" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#8B5CF6"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(todayData.journalEntries / 1, 1))}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-purple-600">{todayData.journalEntries}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Averages */}
      <div className="glass-card rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Weekly Averages</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-blue-600">{avgTasks}</p>
            <p className="text-sm text-gray-600">Tasks per day</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-red-600">{avgPomodoro}</p>
            <p className="text-sm text-gray-600">Pomodoros per day</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-green-600">{avgWater}ml</p>
            <p className="text-sm text-gray-600">Water per day</p>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="glass-card rounded-xl p-4 shadow-lg">
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setViewMode('week')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              viewMode === 'week' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              viewMode === 'month' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks Chart */}
        <div className="glass-card rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Tasks Completed</h3>
          <div className="flex items-end justify-between h-48 gap-1">
            {progressData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(data.tasksCompleted / maxTasks) * 100}%`, minHeight: '4px' }}></div>
                <p className="text-xs text-gray-600 mt-2">{new Date(data.date).getDate()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pomodoro Chart */}
        <div className="glass-card rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Pomodoro Sessions</h3>
          <div className="flex items-end justify-between h-48 gap-1">
            {progressData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-red-500 rounded-t" style={{ height: `${(data.pomodoroSessions / maxPomodoro) * 100}%`, minHeight: '4px' }}></div>
                <p className="text-xs text-gray-600 mt-2">{new Date(data.date).getDate()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Calendar */}
      <div className="glass-card rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Activity Calendar</h3>
        <p className="text-sm text-gray-600 mb-4">Days you've used the app</p>
        <div className="grid grid-cols-7 gap-2">
          {getLast30Days().slice(-28).map((date, index) => (
            <div
              key={index}
              className={`aspect-square rounded flex items-center justify-center text-xs font-medium ${
                isActiveDay(date)
                  ? 'bg-gradient-to-br from-green-400 to-teal-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
              title={date}
            >
              {new Date(date).getDate()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ===== SETTINGS PAGE =====

const Settings = () => {
  const { currentUser, updateUser, logout, deleteAccount } = useAuth();
  const { reminderEnabled, setReminderEnabled } = useApp();
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    waterGoal: currentUser?.preferences?.waterGoal || 2000,
    reminderInterval: currentUser?.preferences?.reminderInterval || 3600,
    quietHoursStart: currentUser?.preferences?.quietHoursStart || 22,
    quietHoursEnd: currentUser?.preferences?.quietHoursEnd || 8
  });
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateUser({
      name: formData.name,
      preferences: {
        ...currentUser.preferences,
        waterGoal: parseInt(formData.waterGoal),
        reminderInterval: parseInt(formData.reminderInterval),
        quietHoursStart: parseInt(formData.quietHoursStart),
        quietHoursEnd: parseInt(formData.quietHoursEnd)
      }
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const exportData = () => {
    const data = {
      user: currentUser,
      tasks: memoryStore[`user_${currentUser.id}_tasks`],
      journal: memoryStore[`user_${currentUser.id}_journalEntries`],
      waterLog: memoryStore[`user_${currentUser.id}_waterLog`],
      pomodoroStats: memoryStore[`user_${currentUser.id}_pomodoroStats`],
      dailyProgress: memoryStore[`user_${currentUser.id}_dailyProgress`]
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifesync-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Settings ⚙️</h2>
        <p className="text-gray-600">Customize your LifeSync experience</p>
      </div>

      {saved && (
        <div className="glass-card rounded-xl p-4 shadow-lg bg-green-50 border-2 border-green-500">
          <p className="text-green-700 font-semibold">✓ Settings saved successfully!</p>
        </div>
      )}

      {/* User Profile */}
      <div className="glass-card rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">👤 Profile Information</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Username</p>
            <p className="text-lg text-gray-800 font-semibold">{currentUser?.username}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Account Created</p>
            <p className="text-lg text-gray-800">{currentUser?.createdAt}</p>
          </div>
        </div>
      </div>

      {/* Account Statistics */}
      <div className="glass-card rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Your Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700">Days Active</p>
            <p className="text-3xl font-bold text-blue-600">{currentUser?.stats?.daysActive?.length || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700">Current Streak</p>
            <p className="text-3xl font-bold text-orange-600">🔥 {currentUser?.stats?.currentStreak || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700">Tasks Completed</p>
            <p className="text-3xl font-bold text-green-600">{currentUser?.stats?.totalTasksCompleted || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700">Pomodoro Sessions</p>
            <p className="text-3xl font-bold text-red-600">{currentUser?.stats?.totalPomodoroSessions || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 col-span-2">
            <p className="text-sm font-medium text-gray-700">Journal Entries</p>
            <p className="text-3xl font-bold text-purple-600">{currentUser?.stats?.totalJournalEntries || 0}</p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <form onSubmit={handleSave} className="glass-card rounded-xl p-6 shadow-lg space-y-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4">⚙️ Preferences</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Daily Water Goal (ml)</label>
          <input
            type="number"
            name="waterGoal"
            value={formData.waterGoal}
            onChange={handleChange}
            min="500"
            max="5000"
            step="250"
            className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quiet Hours Start (Hour)</label>
          <input
            type="number"
            name="quietHoursStart"
            value={formData.quietHoursStart}
            onChange={handleChange}
            min="0"
            max="23"
            className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">No reminders after this hour (0-23)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quiet Hours End (Hour)</label>
          <input
            type="number"
            name="quietHoursEnd"
            value={formData.quietHoursEnd}
            onChange={handleChange}
            min="0"
            max="23"
            className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">No reminders before this hour (0-23)</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="reminderEnabled"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="w-5 h-5 cursor-pointer"
          />
          <label htmlFor="reminderEnabled" className="text-gray-700 font-medium cursor-pointer">
            Enable hourly water reminders
          </label>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          💾 Save Settings
        </button>
      </form>

      {/* Data Management */}
      <div className="glass-card rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Data Management</h3>
        <div className="space-y-3">
          <button
            onClick={exportData}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all"
          >
            📥 Export My Data (JSON)
          </button>
          <p className="text-sm text-gray-600">Download all your data as a JSON file</p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card rounded-xl p-6 shadow-lg border-2 border-red-200" style={{ backgroundColor: '#FFE5E5' }}>
        <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Danger Zone</h3>
        <p className="text-sm text-red-700 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all mb-3"
        >
          🗑️ Delete Your Account
        </button>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to logout?')) {
              logout();
            }
          }}
          className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all"
        >
          🚪 Logout
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-red-600 mb-4">⚠️ Delete Account</h3>
            <p className="text-gray-700 mb-4">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
            <p className="text-sm font-semibold text-gray-800 mb-2">
              Type your username <span className="text-red-600">{currentUser?.username}</span> to confirm deletion:
            </p>
            
            {deleteError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
                {deleteError}
              </div>
            )}
            
            <input
              type="text"
              value={confirmUsername}
              onChange={(e) => {
                setConfirmUsername(e.target.value);
                setDeleteError('');
              }}
              placeholder="Type username to confirm"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:outline-none mb-4"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmUsername('');
                  setDeleteError('');
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmUsername === currentUser?.username) {
                    deleteAccount();
                    alert('Account deleted successfully. Goodbye!');
                  } else {
                    setDeleteError('Type your username to confirm deletion');
                  }
                }}
                disabled={!confirmUsername}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== MEDITATION MODULE =====

const Meditation = () => {
  const [sounds] = useState([
    { id: 1, name: 'Rain', emoji: '🌧️', playing: false, volume: 0.7 },
    { id: 2, name: 'Wind', emoji: '🌬️', playing: false, volume: 0.5 },
    { id: 3, name: 'Ocean', emoji: '🌊', playing: false, volume: 0.8 },
    { id: 4, name: 'Forest', emoji: '🌲', playing: false, volume: 0.6 },
    { id: 5, name: 'Campfire', emoji: '🔥', playing: false, volume: 0.7 },
    { id: 6, name: 'Night', emoji: '🌙', playing: false, volume: 0.5 }
  ]);
  const [activeSounds, setActiveSounds] = useState([]);
  const [focusMode, setFocusMode] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(20);
  const [affirmation] = useState("You are calm. You are centered. You are at peace.");

  const toggleSound = (soundId) => {
    if (activeSounds.includes(soundId)) {
      setActiveSounds(activeSounds.filter(id => id !== soundId));
    } else {
      setActiveSounds([...activeSounds, soundId]);
    }
  };

  const stopAllSounds = () => {
    setActiveSounds([]);
  };

  return (
    <div className="fade-in space-y-6">
      {/* Focus Mode Overlay */}
      {focusMode && (
        <div className="focus-overlay" onClick={() => setFocusMode(false)}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <p className="text-4xl mb-4">🧘</p>
              <p className="text-2xl font-semibold">{affirmation}</p>
              <p className="text-sm mt-4 opacity-70">Click anywhere to exit focus mode</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-card rounded-2xl p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Meditation &amp; Sound Hub 🧘</h2>
        <p className="text-gray-600">Find your calm with ambient sounds</p>
      </div>

      {/* Affirmation */}
      <div className="quote-card rounded-xl p-6 shadow-lg text-center">
        <p className="text-xl italic text-gray-700">✨ {affirmation}</p>
      </div>

      {/* Controls */}
      <div className="glass-card rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-4">
            <button
              onClick={() => setFocusMode(true)}
              className="btn-hover px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold"
            >
              🎯 Focus Mode
            </button>
            <button
              onClick={stopAllSounds}
              className="btn-hover px-6 py-3 bg-red-500 text-white rounded-lg font-semibold"
            >
              ⏹ Stop All
            </button>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-gray-700 font-medium">Timer:</label>
            <input
              type="number"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(e.target.value)}
              min="1"
              max="120"
              className="w-20 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
            />
            <span className="text-gray-600">minutes</span>
          </div>
        </div>
      </div>

      {/* Sound Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sounds.map(sound => (
          <div
            key={sound.id}
            onClick={() => toggleSound(sound.id)}
            className={`sound-card glass-card rounded-xl p-6 shadow-lg text-center cursor-pointer ${
              activeSounds.includes(sound.id) ? 'playing' : ''
            }`}
          >
            <div className="text-6xl mb-4">{sound.emoji}</div>
            <h3 className="text-xl font-bold mb-2">{sound.name}</h3>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm">
                {activeSounds.includes(sound.id) ? '▶ Playing' : '⏸ Paused'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Sounds Info */}
      {activeSounds.length > 0 && (
        <div className="glass-card rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🎵 Active Sounds</h3>
          <div className="flex flex-wrap gap-3">
            {activeSounds.map(id => {
              const sound = sounds.find(s => s.id === id);
              return (
                <span key={id} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full font-semibold">
                  {sound.emoji} {sound.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="glass-card rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🌟 Benefits of Meditation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-50 rounded-lg p-4">
            <p className="font-semibold text-gray-800 mb-2">🧠 Mental Clarity</p>
            <p className="text-sm text-gray-600">Improve focus and decision-making</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded-lg p-4">
            <p className="font-semibold text-gray-800 mb-2">❤️ Stress Relief</p>
            <p className="text-sm text-gray-600">Reduce anxiety and tension</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded-lg p-4">
            <p className="font-semibold text-gray-800 mb-2">😴 Better Sleep</p>
            <p className="text-sm text-gray-600">Improve sleep quality and duration</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded-lg p-4">
            <p className="font-semibold text-gray-800 mb-2">🌈 Emotional Balance</p>
            <p className="text-sm text-gray-600">Enhance self-awareness and calm</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== MAIN APP COMPONENT =====

const App = () => {
  const { currentUser } = useAuth();
  const { currentModule } = useApp();
  const [showQuote, setShowQuote] = useState(true);

  // Show quote screen on first load
  useEffect(() => {
    const hasSeenQuote = memoryStore[`quote_seen_${currentUser?.id}_${getFormattedDate()}`];
    if (hasSeenQuote) {
      setShowQuote(false);
    }
  }, [currentUser?.id]);

  const handleQuoteComplete = () => {
    memoryStore[`quote_seen_${currentUser?.id}_${getFormattedDate()}`] = true;
    setShowQuote(false);
  };

  if (showQuote) {
    return <QuoteScreen userName={currentUser?.name} onComplete={handleQuoteComplete} />;
  }

  const renderModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'tasks':
        return <Tasks />;
      case 'pomodoro':
        return <Pomodoro />;
      case 'water':
        return <WaterTracker />;
      case 'journal':
        return <Journal />;
      case 'meditation':
        return <Meditation />;
      case 'progress':
        return <ProgressTracker />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* App Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            LifeSync Pro
          </h1>
          <p className="text-gray-600 text-lg">Your Personal Wellness Dashboard</p>
        </div>

        {/* Navigation */}
        <Navigation />

        {/* Water Reminder Modal */}
        <WaterReminderModal />

        {/* Module Content */}
        <div className="mt-6">
          {renderModule()}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-600">
          <p>Made with 💙 for your wellness journey</p>
        </footer>
      </div>
    </div>
  );
};

const MainApp = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
};

// ===== RENDER APP =====

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);