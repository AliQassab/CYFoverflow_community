import { Link } from "react-router-dom";

/**
 * Component to display a clickable user name that links to their profile
 * @param {Object} props
 * @param {string} props.userId - User ID
 * @param {string} props.userName - User name to display
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.showAnonymous] - Whether to show "Anonymous" if no name
 */
function UserLink({ userId, userName, className = "", showAnonymous = true }) {
	if (!userId) {
		return (
			<span className={className}>
				{userName || (showAnonymous ? "Anonymous" : "")}
			</span>
		);
	}

	return (
		<Link
			to={`/users/${userId}`}
			className={`hover:text-[#281d80] hover:underline transition-colors ${className}`}
		>
			{userName || (showAnonymous ? "Anonymous" : "")}
		</Link>
	);
}

export default UserLink;
