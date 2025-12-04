import { useState, useEffect } from 'react';
import api from '../lib/api';
import Layout from '../components/Layout';

export default function Leaderboard({ user, profile }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    loadCourses();
    loadLeaderboard();
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [courseId]);

  const loadCourses = async () => {
    try {
      const res = await api.get('/courses');
      setCourses(res.data);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const params = courseId ? { courseId } : {};
      const res = await api.get('/leaderboard', { params });
      setLeaderboard(res.data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Layout user={user} profile={profile}><div>Loading...</div></Layout>;
  }

  return (
    <Layout user={user} profile={profile}>
      <div className="flex-between mb-20">
        <h2>Leaderboard</h2>
        <select
          className="input"
          style={{ width: 'auto', minWidth: '200px' }}
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          <option value="">All Courses</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>{course.title}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student</th>
              <th>Total Points</th>
              <th>Submissions</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={entry.student_id}>
                <td>
                  <strong>#{entry.rank}</strong>
                  {entry.rank === 1 && ' 🏆'}
                </td>
                <td>{entry.name || entry.email}</td>
                <td><strong>{entry.total_points}</strong></td>
                <td>{entry.submissions_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {leaderboard.length === 0 && (
          <div className="empty-state">
            <p>No submissions yet</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

