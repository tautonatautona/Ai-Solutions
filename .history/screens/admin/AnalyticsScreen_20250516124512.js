import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, Dimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, analytics } from '../../firebaseConfig';
import { isSupported } from 'firebase/analytics';
import { BarChart } from 'react-native-gifted-charts';

const screenWidth = Dimensions.get('window').width;

const AnalyticsScreen = () => {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    chatSessions: 0,
    avgSessionDuration: '0 mins',
    totalBookings: 0,
    bookingsPerEvent: {},
    viewsPerEvent: {},
    firebaseUserDistribution: { newUsers: 0, returningUsers: 0 },
  });
  const [feedbacks, setFeedbacks] = useState([]);
  const [botAnalytics, setBotAnalytics] = useState([]);
  const [aggregatedBotMetrics, setAggregatedBotMetrics] = useState({ returningUsers: 0, newUsers: 0, sessions: 0, userMessages: 0, botMessages: 0 });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

    const fetchFirebaseAnalytics = async () => {
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const activeUsersQuery = query(collection(db, 'users'), where('lastActive', '>', startDate));
      const activeUsersSnapshot = await getDocs(activeUsersQuery);
      const chatsQuery = query(collection(db, 'chatMessages'), where('startTime', '>=', startDate), where('endTime', '<=', endDate));
      const chatsSnapshot = await getDocs(chatsQuery);

      let newUsersCount = 0;
      let returningUsersCount = 0;
      const newUserThreshold = startDate.getTime();
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt && data.createdAt.toDate) {
          const createdAtTime = data.createdAt.toDate().getTime();
          if (createdAtTime >= newUserThreshold) newUsersCount++;
          else returningUsersCount++;
        } else returningUsersCount++;
      });

      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const bookingsPerEvent = {};
      bookingsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.eventName) bookingsPerEvent[data.eventName] = (bookingsPerEvent[data.eventName] || 0) + 1;
      });

      const viewsSnapshot = await getDocs(collection(db, 'eventViews'));
      const viewsPerEvent = {};
      viewsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.eventName) viewsPerEvent[data.eventName] = (viewsPerEvent[data.eventName] || 0) + 1;
      });

      const feedbacksQuery = query(
        collection(db, 'feedbacks'),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );
      const feedbacksSnapshot = await getDocs(feedbacksQuery);
      const feedbacksList = [];
      feedbacksSnapshot.forEach(doc => {
        const data = doc.data();
        feedbacksList.push({
          id: doc.id,
          chatbotFeedback: data.chatbotFeedback || '',
          serviceQualityFeedback: data.serviceQualityFeedback || '',
          createdAt: data.createdAt ? data.createdAt.toDate() : null,
        });
      });
      setFeedbacks(feedbacksList);

      // Calculate average session duration based on chat start and end times
      let totalSessionDurationMs = 0;
      chatsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.startTime && data.endTime && data.startTime.toDate && data.endTime.toDate) {
          const start = data.startTime.toDate();
          const end = data.endTime.toDate();
          totalSessionDurationMs += end.getTime() - start.getTime();
        }
      });
      const avgSessionDurationMs = chatsSnapshot.size > 0 ? totalSessionDurationMs / chatsSnapshot.size : 0;
      const avgSessionDurationMins = Math.round(avgSessionDurationMs / 60000);

      setMetrics({
        totalUsers: usersSnapshot.size,
        activeUsers: activeUsersSnapshot.size,
        chatSessions: chatsSnapshot.size,
        avgSessionDuration: `${avgSessionDurationMins} mins`,
        totalBookings: bookingsSnapshot.size,
        bookingsPerEvent,
        viewsPerEvent,
        firebaseUserDistribution: { newUsers: newUsersCount, returningUsers: returningUsersCount },
      });
    };

const fetchBotAnalytics = async () => {
    try {
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);
      const encodedStart = encodeURIComponent(`${startStr}T00:00:00Z`);
      const encodedEnd = encodeURIComponent(`${endStr}T23:59:59Z`);
      const url = `https://api.botpress.cloud/v1/admin/bots/39199b9a-b5bb-4abb-b484-5f0fed484382/analytics?startDate=${encodedStart}&endDate=${encodedEnd}`;
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-workspace-id': 'wkspace_01JS2NF005NCYQ6PTNV6C7ZQPG',
          authorization: 'Bearer bp_pat_ehm9MDtz8HD1hhJEKk4BC41bqD484mF9nFCl'
        }
      };
      console.log('Fetching bot analytics from URL:', url);
      const response = await fetch(url, options);
      console.log('Response status:', response.status);
      const json = await response.json();
      console.log('Bot analytics response JSON:', json);
      if (json.records) {
        setBotAnalytics(json.records);
        // Compute aggregated bot analytics metrics
        const aggregated = json.records.reduce(
          (acc, record) => {
            acc.returningUsers += record.returningUsers || 0;
            acc.newUsers += record.newUsers || 0;
            acc.sessions += record.sessions || 0;
            acc.userMessages += record.userMessages || 0;
            acc.botMessages += record.botMessages || 0;
            return acc;
          },
          { returningUsers: 0, newUsers: 0, sessions: 0, userMessages: 0, botMessages: 0 }
        );
        setAggregatedBotMetrics(aggregated);
      } else {
        setBotAnalytics([]);
        setAggregatedBotMetrics({ returningUsers: 0, newUsers: 0, sessions: 0, userMessages: 0, botMessages: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch bot analytics:', error);
      setBotAnalytics([]);
      setAggregatedBotMetrics({ returningUsers: 0, newUsers: 0, sessions: 0, userMessages: 0, botMessages: 0 });
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchFirebaseAnalytics(), fetchBotAnalytics()]);
    } catch (err) {
      console.error('Analytics fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
    const logScreenView = async () => {
      const supported = await isSupported();
      if (supported) {
        const analyticsInstance = analytics();
        analyticsInstance.logEvent('screen_view', {
          screen_name: 'AdminAnalyticsScreen',
          screen_class: 'AnalyticsScreen',
        });
      }
    };
    logScreenView();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4c8bf5" />
        <Text>Loading analytics data...</Text>
      </View>
    );
  }

  // Prepare data for BarChart from bookingsPerEvent
  const bookingsData = Object.entries(metrics.bookingsPerEvent).map(([event, count]) => ({
    value: count,
    label: event,
    frontColor: '#4c8bf5',
    dataPointText: count.toString(),
    spacing: 18,
    roundedTop: true,
  }));

  // Prepare data for botAnalytics BarChart - example: sessions per day
  const botSessionsData = botAnalytics.map(record => ({
    value: record.sessions,
    label: new Date(record.startDateTimeUtc).toLocaleDateString(),
    frontColor: '#f57c00',
    dataPointText: record.sessions.toString(),
    spacing: 18,
    roundedTop: true,
  }));

  // Prepare aggregated bot analytics metrics for display
  const aggregatedMetrics = aggregatedBotMetrics || { returningUsers: 0, newUsers: 0, sessions: 0, userMessages: 0, botMessages: 0 };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>📊 System Analytics Dashboard</Text>

      <View style={styles.filterSection}>
        <Pressable style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
          <Text style={styles.dateButtonText}>Start: {startDate.toDateString()}</Text>
        </Pressable>
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowStartPicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}

        <Pressable style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
          <Text style={styles.dateButtonText}>End: {endDate.toDateString()}</Text>
        </Pressable>
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowEndPicker(false);
              if (date) setEndDate(date);
            }}
          />
        )}

        <Pressable style={styles.applyButton} onPress={applyFilters}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </Pressable>
      </View>

      <View style={styles.metricsGrid}>
        {['Total Users', 'Active Users', 'Avg Session', 'Total Bookings'].map((label, i) => (
          <View key={i} style={styles.metricCard}>
            <Text style={styles.metricValue}>{Object.values(metrics)[i]}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Bot Analytics - Summary</Text>
        <View style={styles.metricsGrid}>
          {[
            { label: 'Returning Users', value: aggregatedMetrics.returningUsers },
            { label: 'New Users', value: aggregatedMetrics.newUsers },
            { label: 'Sessions', value: aggregatedMetrics.sessions },
            { label: 'User Messages', value: aggregatedMetrics.userMessages },
            { label: 'Bot Messages', value: aggregatedMetrics.botMessages },
          ].map((item, index) => (
            <View key={index} style={styles.metricCard}>
              <Text style={styles.metricValue}>{item.value}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Bookings Per Event</Text>
        <BarChart
          data={bookingsData}
          width={screenWidth - 40}
          height={230}
          barWidth={22}
          frontColor="#4c8bf5"
          noOfSections={5}
          yAxisTextStyle={{ color: '#2a4d9b', fontSize: 13, fontWeight: '600' }}
          xAxisTextStyle={{ color: '#2a4d9b', fontSize: 13, fontWeight: '600', rotation: 45, marginTop: 12 }}
          showLine={true}
          yAxisColor="#2a4d9b"
          xAxisColor="#2a4d9b"
          spacing={22}
          roundedTop={true}
          barBorderRadius={10}
          animateOnDataChange={true}
          dataPointLabelStyle={{ color: '#2a4d9b', fontWeight: '700', fontSize: 12 }}
          dataPointLabelShiftY={-18}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Bot Analytics - Sessions Per Day</Text>
        {botSessionsData.length === 0 ? (
          <Text style={styles.metricLabel}>No bot analytics data available for the selected date range.</Text>
        ) : (
          <BarChart
            data={botSessionsData}
            width={screenWidth - 40}
            height={230}
            barWidth={22}
            frontColor="#f57c00"
            noOfSections={5}
            yAxisTextStyle={{ color: '#b35e00', fontSize: 13, fontWeight: '600' }}
            xAxisTextStyle={{ color: '#b35e00', fontSize: 13, fontWeight: '600', rotation: 45, marginTop: 12 }}
            showLine={true}
            yAxisColor="#b35e00"
            xAxisColor="#b35e00"
            spacing={22}
            roundedTop={true}
            barBorderRadius={10}
            animateOnDataChange={true}
            dataPointLabelStyle={{ color: '#b35e00', fontWeight: '700', fontSize: 12 }}
            dataPointLabelShiftY={-18}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 User Feedback</Text>
        {feedbacks.length === 0 ? (
          <Text style={styles.metricLabel}>No feedback available for the selected date range.</Text>
        ) : (
          feedbacks.map((fb) => (
            <View key={fb.id} style={styles.feedbackCard}>
              <Text style={styles.feedbackDate}>{fb.createdAt ? fb.createdAt.toLocaleString() : 'Unknown date'}</Text>
              {fb.chatbotFeedback ? (
                <>
                  <Text style={styles.feedbackLabel}>Chatbot Feedback:</Text>
                  <Text style={styles.feedbackText}>{fb.chatbotFeedback}</Text>
                </>
              ) : null}
              {fb.serviceQualityFeedback ? (
                <>
                  <Text style={styles.feedbackLabel}>Service Quality Feedback:</Text>
                  <Text style={styles.feedbackText}>{fb.serviceQualityFeedback}</Text>
                </>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f4f8ff' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: { 
    fontSize: 28, 
    fontWeight: '900', 
    marginBottom: 28, 
    textAlign: 'center', 
    color: '#1a3c72',
    textShadowColor: 'rgba(26, 60, 114, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  metricsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    marginBottom: 28 
  },
  metricCard: { 
    width: '48%', 
    backgroundColor: '#ffffff', 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 18, 
    shadowColor: '#1a3c72', 
    shadowOffset: { 
      width: 0, 
      height: 6 
    }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 6 
  },
  metricValue: { 
    fontSize: 30, 
    fontWeight: '800', 
    color: '#2a4d9b', 
    textAlign: 'center' 
  },
  metricLabel: { 
    textAlign: 'center', 
    color: '#555', 
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  section: { 
    backgroundColor: '#ffffff', 
    padding: 24, 
    borderRadius: 20, 
    elevation: 6, 
    marginBottom: 36,
    shadowColor: '#1a3c72',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  sectionTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    marginBottom: 16, 
    color: '#0f2a57' 
  },
  filterSection: { 
    marginBottom: 28 
  },
  dateButton: { 
    backgroundColor: '#dbe9ff', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 12,
    shadowColor: '#1a3c72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  dateButtonText: { 
    textAlign: 'center', 
    color: '#2a4d9b', 
    fontWeight: '700',
    fontSize: 16,
  },
  applyButton: { 
    backgroundColor: '#2a4d9b', 
    borderRadius: 12, 
    padding: 14, 
    marginTop: 6,
    shadowColor: '#1a3c72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  applyButtonText: { 
    textAlign: 'center', 
    color: 'white', 
    fontWeight: '700', 
    fontSize: 18 
  },
  feedbackCard: {
    backgroundColor: '#dbe9ff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#1a3c72',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  feedbackDate: {
    fontSize: 13,
    color: '#444',
    marginBottom: 10,
    fontWeight: '600',
  },
  feedbackLabel: {
    fontWeight: '800',
    color: '#0f2a57',
    marginBottom: 6,
    fontSize: 15,
  },
  feedbackText: {
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 10,
  },
});

export default AnalyticsScreen;
