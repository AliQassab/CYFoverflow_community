import React from "react";

class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error, errorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
		this.setState({
			error,
			errorInfo,
		});
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen bg-red-50 p-8">
					<div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 border-2 border-red-500">
						<h1 className="text-2xl font-bold text-red-600 mb-4">
							⚠️ Something went wrong
						</h1>
						<p className="text-gray-700 mb-4">
							An error occurred in the application. Please check the console for
							details.
						</p>
						{this.state.error && (
							<div className="bg-red-100 p-4 rounded mb-4">
								<p className="font-semibold text-red-800">Error:</p>
								<p className="text-red-700 text-sm font-mono">
									{this.state.error.toString()}
								</p>
							</div>
						)}
						{this.state.errorInfo && (
							<details className="bg-gray-100 p-4 rounded">
								<summary className="cursor-pointer font-semibold text-gray-700">
									Stack Trace
								</summary>
								<pre className="text-xs text-gray-600 mt-2 overflow-auto">
									{this.state.errorInfo.componentStack}
								</pre>
							</details>
						)}
						<button
							onClick={() => {
								this.setState({
									hasError: false,
									error: null,
									errorInfo: null,
								});
								window.location.reload();
							}}
							className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
						>
							Reload Page
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
