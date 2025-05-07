import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    backgroundGradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#F8F9FF",
    },
    priorityBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: "#FF4D4D20",
    },
    priorityText: {
        marginLeft: 4,
        fontSize: 12,
        fontWeight: "600",
        color: "#FF4D4D",
    },
    contentContainer: {
        padding: 16,
    },
    announcementContainer: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 12,
    },
    categoryBadge: {
        backgroundColor: "#7F5AF020",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: "flex-start",
        marginBottom: 12,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#7F5AF0",
    },
    mediaContainer: {
        width: "100%",
        height: 200,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16,
    },
    media: {
        width: "100%",
        height: "100%",
    },
    content: {
        fontSize: 16,
        lineHeight: 24,
        color: "#4A5568",
        marginBottom: 16,
    },
    date: {
        fontSize: 14,
        color: "#718096",
    },
    reactionsContainer: {
        marginBottom: 24,
    },
    reactionsScroll: {
        paddingHorizontal: 16,
    },
    reactionButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FF",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    activeReactionButton: {
        backgroundColor: "#7F5AF020",
    },
    reactionEmoji: {
        fontSize: 16,
        marginRight: 4,
    },
    reactionCount: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4A5568",
    },
    commentsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    commentsTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    commentsCount: {
        fontSize: 14,
        color: "#718096",
    },
    commentContainer: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    commentHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    commentUserInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#7F5AF0",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    userInitial: {
        fontSize: 16,
        fontWeight: "600",
        color: "#ffffff",
    },
    userName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    commentDate: {
        fontSize: 12,
        color: "#718096",
        marginTop: 2,
    },
    commentContent: {
        fontSize: 14,
        lineHeight: 20,
        color: "#4A5568",
    },
    emptyComments: {
        alignItems: "center",
        padding: 32,
    },
    emptyCommentsText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#4A5568",
        marginTop: 12,
    },
    emptyCommentsSubtext: {
        fontSize: 14,
        color: "#718096",
        marginTop: 4,
    },
    commentInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#ffffff",
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },
    commentInput: {
        flex: 1,
        backgroundColor: "#F8F9FF",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        fontSize: 14,
        color: "#1A1A1A",
        maxHeight: 100,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#7F5AF0",
        alignItems: "center",
        justifyContent: "center",
    },
    sendButtonDisabled: {
        backgroundColor: "#E2E8F0",
    },
    addCommentButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "#ffffff",
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },
    addCommentText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#7F5AF0",
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
    },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
    },
    errorText: {
        fontSize: 16,
        color: "#FF4D4D",
        marginTop: 12,
    },
    highPriorityGradient: {
        backgroundColor: "#FF4D4D20",
    },
    mediumPriorityGradient: {
        backgroundColor: "#FFAA3320",
    },
    lowPriorityGradient: {
        backgroundColor: "#2CB67D20",
    },
    highPriorityBadge: {
        backgroundColor: "#FF4D4D20",
    },
    mediumPriorityBadge: {
        backgroundColor: "#FFAA3320",
    },
    lowPriorityBadge: {
        backgroundColor: "#2CB67D20",
    },
    highPriorityText: {
        color: "#FF4D4D",
    },
    mediumPriorityText: {
        color: "#FFAA33",
    },
    lowPriorityText: {
        color: "#2CB67D",
    },
}); 