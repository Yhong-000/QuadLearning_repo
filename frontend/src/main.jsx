import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import AdminHomeScreen from './AdminScreens/AdminHomeScreen';
import AdminViewAllUsersScreen from './AdminScreens/AdminViewAllUsersScreen';
import Strands from './AdminScreens/Strands';
import StudentHomeScreen from './StudentScreens/StudentHomeScreen';
import TeacherHomeScreen from './TeacherScreens/TeacherHomeScreen';
import AdminCreateStudentAccount from './AdminScreens/AdminCreateStudentAccount';
import AdminCreateTeacherAccount from './AdminScreens/AdminCreateTeacherAccount';
import ManageSubjects from './AdminScreens/ManageSubjects';
import ManageSemesters from './AdminScreens/ManageSemesters';
import ManageSections from './AdminScreens/ManageSections';
import TeacherViewStudents from './TeacherScreens/TeacherViewStudents';
import TeacherEncodeGrade from './TeacherScreens/TeacherEncodeGrade';
import TeacherGenerateForm from './TeacherScreens/TeacherGenerateForm';
import StudentProfile from './StudentScreens/StudentProfile';
import StudentViewGrades from './StudentScreens/StudentViewGrades';
import ArchivedSemesters from './AdminScreens/AdminArchiveSemester'; // New import
import ArchiveSemester from './AdminScreens/AdminArchiveSemester'; // New import

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<App />}>
      <Route index={true} path='/' element={<HomeScreen />} />
      <Route path='/login' element={<LoginScreen />} />
      <Route path='/admin' element={<AdminHomeScreen />} />
      <Route path='/admin/Strands' element={<Strands />} />
      <Route path='/login/AdminScreens/AdminHomeScreen' element={<AdminHomeScreen />} />
      <Route path='/admin/AdminViewAllUsersScreen' element={<AdminViewAllUsersScreen />} />
      <Route path='/login/StudentScreens/StudentHomeScreen' element={<StudentHomeScreen />} />
      <Route path='/login/TeacherScreens/TeacherHomeScreen' element={<TeacherHomeScreen />} />
      <Route path='/admin/AdminCreateStudentAccount/' element={<AdminCreateStudentAccount />} />
      <Route path='/admin/AdminCreateTeacherAccount' element={<AdminCreateTeacherAccount />} />
      <Route path='/admin/ManageSubjects' element={<ManageSubjects />} />
      <Route path='/admin/ManageSemesters' element={<ManageSemesters />} />
      <Route path='/admin/ManageSections' element={<ManageSections />} />
      <Route path='/login/TeacherScreens/TeacherViewStudents' element={<TeacherViewStudents />} />
      <Route path='/login/TeacherScreens/TeacherEncodeGrade' element={<TeacherEncodeGrade />} />
      <Route path='/login/TeacherScreens/TeacherGenerateForm' element={<TeacherGenerateForm />} />
      <Route path='/login/StudentScreens/StudentProfile' element={<StudentProfile />} />
      <Route path='/login/StudentScreens/StudentViewGrades' element={<StudentViewGrades />} />

      {/* Archive Routes */}
      <Route path='/admin/ArchivedSemesters' element={<ArchivedSemesters />} /> {/* Archived Semesters */}
      <Route path='/admin/ArchiveSemester' element={<ArchiveSemester />} /> {/* Archive Semester */}
    </Route>
  )
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);