import { StatusBar, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Khadamat Mobile</Text>
      <Text style={styles.subtitle}>Expo app is running correctly.</Text>
      <StatusBar barStyle="dark-content" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 16,
    textAlign: "center",
  },
});
