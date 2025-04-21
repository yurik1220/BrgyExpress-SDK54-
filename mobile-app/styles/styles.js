import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  // Add these inside the StyleSheet.create({...}) block
  titleText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },

  docButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
  },

  docButtonText: {
    color: "#fff",
    fontSize: 16,
  },

  container: {
    flex: 1,
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    position: "absolute",
    top: -40,
    left: -20,
  },
  slideshowContainer: {
    width: 300,
    height: 125,
    backgroundColor: "#ddd",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 60,
    overflow: "hidden",
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "stretch",
  },
  buttonContainer: {
    marginTop: 30,
    width: "100%",
    alignItems: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginBottom: 20,
  },
  bigButton: {
    width: 150,
    height: 150,
    marginHorizontal: 5,
  },
  rectButton: {
    width: 300,
    height: 130,
    backgroundColor: "#4CAF50", // Use your desired background color
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10, // Remove rounding of the corners
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  picker: {
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
  },
  submitButton: {
    marginTop: 30,
    width: "100%",
    alignSelf: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    height: 100,
    textAlignVertical: "top",
  },
  uploadButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  preview: {
    width: "100%",
    height: 200,
    marginBottom: 10,
  },
  submitReport: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  detailsHeader: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  detailItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    elevation: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    color: "#000",
  },
  backButton: {
    marginTop: 30,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  mediaPreview: {
    width: "100%", // Makes image responsive to container
    height: 175, // Or set to 'auto' if you're calculating it
    resizeMode: "contain", // Makes sure it fits and doesn't stretch
    borderRadius: 10,
    marginTop: 10,
  },
  text: {
    fontSize: 16,
    color: "gray",
    textAlign: "center",
    marginTop: 10,
  },
});

export default styles;
