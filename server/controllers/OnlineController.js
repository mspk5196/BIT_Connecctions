import db from "../src/config/db.js";

// Function to update user ping status
export const updateUserPing = async (req, res) => {
    try {
        const userId = req.params.id;

        const query = `
            UPDATE login
            SET last_seen = NOW(),
                    is_online = TRUE,
                    updated_at = NOW()
            WHERE id = $1
        `;

        await db.query(query, [userId]);

        res.json({ success: true });
    } catch (error) {
        console.error("Error updating user ping:", error);
        res.status(500).json({
            success: false,
            error: "Failed to update online status",
        });
    }
};

// Function to get online users with total count
export const getOnlineUsers = async (req, res) => {
    try {
        // Get online users
        const onlineUsersQuery = `
            SELECT
                id,
                username,
                email,
                role,
                last_seen,
                CASE
                    WHEN is_online = TRUE THEN 'Online'
                    WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN 'Recently Online'
                    ELSE 'Offline'
                END as status
            FROM login
            WHERE is_online = TRUE
            ORDER BY last_seen DESC
        `;

        const onlineUsersResult = await db.query(onlineUsersQuery);
        const onlineUsers = onlineUsersResult.rows || [];

        // Get total count of all users
        const totalCountQuery = `
            SELECT COUNT(*) as total_count
            FROM login
        `;

        const totalCountResult = await db.query(totalCountQuery);
        const totalCount = Number(totalCountResult.rows?.[0]?.total_count || 0);
        const onlineCount = onlineUsers.length;

        res.json({
            success: true,
            data: onlineUsers,
            totalCount,
            onlineCount,
            onlinePercentage:
                totalCount > 0
                    ? Math.round((onlineCount / totalCount) * 100)
                    : 0,
        });
    } catch (error) {
        console.error("Error fetching online users:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch online users",
        });
    }
};

// Background task functions
export const markOfflineUsers = async () => {
    try {
        const query = `
            UPDATE login
            SET is_online = FALSE,
                    updated_at = NOW()
            WHERE last_seen < NOW() - INTERVAL '30 seconds'
                AND is_online = TRUE
        `;

        const result = await db.query(query);

        if (result.rowCount && result.rowCount > 0) {
            console.log(`Marked ${result.rowCount} users as offline`);
        }
    } catch (error) {
        console.error("Error marking users offline:", error);
    }
};

// Start the background task
export const startOnlineStatusTask = () => {
    markOfflineUsers();
    setInterval(markOfflineUsers, 120000);
    console.log('Online status background task started');
};
