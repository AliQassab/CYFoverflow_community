import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import ErrorBoundary from "./components/ErrorBoundary";
import InstallPrompt from "./components/InstallPrompt";
import Navbar from "./components/Navbar";
import PushNotificationHandler from "./components/PushNotificationHandler";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { LabelFilterProvider } from "./contexts/LabelFilterContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SearchProvider } from "./contexts/SearchContext";
import { ToastProvider } from "./contexts/ToastContext";
import AdminPage from "./pages/AdminPage.jsx";
import EditQuestion from "./pages/EditQuestion.jsx";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import LabelsPage from "./pages/LabelsPage";
import Login from "./pages/Login";
import MyQuestionsPage from "./pages/MyQuestionsPage";
import MyResponsesPage from "./pages/MyResponsesPage";
import QuestionDetailPage from "./pages/QuestionDetailPage";
import QuestionPage from "./pages/QuestionPage";
import ResetPassword from "./pages/ResetPassword";
import SignUp from "./pages/SignUp";
import UserProfilePage from "./pages/UserProfilePage";
import "./App.css";

function App() {
	return (
		<ErrorBoundary>
			<AuthProvider>
				<ErrorBoundary>
					<ToastProvider>
						<ErrorBoundary>
							<NotificationProvider>
								<ErrorBoundary>
									<SearchProvider>
										<LabelFilterProvider>
											<PushNotificationHandler />
											<InstallPrompt />
											<Router>
												<div
													className="min-h-screen"
													style={{ backgroundColor: "#efeef8" }}
												>
													<Navbar />
													<Routes>
														{/* Existing Routes */}
														<Route path="/" element={<Home />} />
														<Route path="/login" element={<Login />} />
														<Route path="/signup" element={<SignUp />} />
														<Route
															path="/forgot-password"
															element={<ForgotPassword />}
														/>
														<Route
															path="/reset-password"
															element={<ResetPassword />}
														/>
														<Route path="/ask" element={<QuestionPage />} />

														<Route
															path="/questions/:id"
															element={<QuestionDetailPage />}
														/>
														<Route path="/labels" element={<LabelsPage />} />
														<Route
															path="/my-questions"
															element={<MyQuestionsPage />}
														/>
														<Route
															path="/my-responses"
															element={<MyResponsesPage />}
														/>
														<Route
															path="/users/:id"
															element={<UserProfilePage />}
														/>

														<Route
															path="/questions/:id/edit"
															element={<EditQuestion />}
														/>
														<Route path="/admin" element={<AdminPage />} />
													</Routes>
												</div>
											</Router>
										</LabelFilterProvider>
									</SearchProvider>
								</ErrorBoundary>
							</NotificationProvider>
						</ErrorBoundary>
					</ToastProvider>
				</ErrorBoundary>
			</AuthProvider>
		</ErrorBoundary>
	);
}

export default App;
