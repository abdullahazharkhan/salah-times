import React, { useEffect, useState } from "react";
import { Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import moment from "moment-timezone";

// Helper function to convert "HH:MM" time to 12-hour format with AM/PM.
function convertTo12Hour(time24: string) {
  if (!time24.includes(":")) return time24;
  const [hourStr, minuteStr] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
}

// Helper function to format milliseconds into HH:MM:SS string.
function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function Index() {
  // 1 = Islamic Sciences Karachi, 4 = Umm al Qura
  const [selectedMethod, setSelectedMethod] = useState(1);
  // school: 0 or 1; when 1, include &school=1 in the query.
  const [school, setSchool] = useState(0);
  const [timings, setTimings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [khiTime, setKhiTime] = useState<number>(0);

  // Countdown states
  const [nextPrayerName, setNextPrayerName] = useState<string>("");
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [sunriseCountdown, setSunriseCountdown] = useState<number>(0);
  const [midnightCountdown, setMidnightCountdown] = useState<number>(0);

  // Fetch timings when selectedMethod or school changes.
  useEffect(() => {
    const fetchTimings = async () => {
      setLoading(true);
      try {
        let url = `https://api.aladhan.com/v1/timingsByAddress?address=Karachi,Pakistan&method=${selectedMethod}`;
        if (school === 1) {
          url += "&school=1";
        }
        const response = await fetch(url);
        const data = await response.json();
        if (data?.data?.timings) {
          setTimings(data.data.timings);
        }
      } catch (error) {
        console.error("Error fetching timings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimings();
  }, [selectedMethod, school]);

  // Compute countdowns for next prayer, sunrise, and midnight.
  useEffect(() => {
    if (!timings) return;

    // Define the order of prayers (excluding Sunrise and Midnight).
    const prayerOrder = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

    function updateCountdowns() {
      // Use moment-timezone to get current time in Karachi.
      const now = moment.tz("Asia/Karachi");
      setKhiTime(now.valueOf());

      let nextName = "";
      let smallestDiff = Number.MAX_VALUE;

      prayerOrder.forEach((prayer) => {
        if (!timings[prayer]) return;
        // Build a moment object for the prayer time in Karachi.
        const prayerTime = moment.tz(
          `${now.format("YYYY-MM-DD")} ${timings[prayer]}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Karachi"
        );
        // If the prayer time has passed today, skip it.
        if (prayerTime.isBefore(now)) return;
        const diff = prayerTime.diff(now);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          nextName = prayer;
        }
      });

      // If all today's prayers have passed, choose tomorrow's Fajr.
      if (!nextName) {
        const tomorrowFajr = moment.tz(
          `${now.add(1, "day").format("YYYY-MM-DD")} ${timings["Fajr"]}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Karachi"
        );
        smallestDiff = tomorrowFajr.diff(moment.tz("Asia/Karachi"));
        nextName = "Fajr";
      }
      setNextPrayerName(nextName);
      setTimeLeftMs(smallestDiff);

      // Calculate Sunrise countdown.
      if (timings["Sunrise"]) {
        let sunriseTime = moment.tz(
          `${now.format("YYYY-MM-DD")} ${timings["Sunrise"]}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Karachi"
        );
        if (sunriseTime.isBefore(now)) {
          sunriseTime = moment.tz(
            `${now.add(1, "day").format("YYYY-MM-DD")} ${timings["Sunrise"]}`,
            "YYYY-MM-DD HH:mm",
            "Asia/Karachi"
          );
        }
        setSunriseCountdown(sunriseTime.diff(moment.tz("Asia/Karachi")));
      }

      // Calculate Midnight countdown (next midnight).
      const midnightTime = moment.tz("Asia/Karachi").endOf("day").add(1, "second");
      setMidnightCountdown(midnightTime.diff(moment.tz("Asia/Karachi")));
    }

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [timings]);

  return (
    <ScrollView contentContainerStyle={{
      backgroundColor: "#111728",
      flexGrow: 1,
      alignItems: "center",
      padding: 16,
    }}>
      <View className="w-full bg-[#00c871] py-6">
        <Text className="text-white font-extrabold text-5xl text-center">
          Salah Times
        </Text>
      </View>

      {/* Buttons to select timing method */}
      <View className="mt-6 flex-row space-x-4 mx-auto">
        <TouchableOpacity
          className={`mx-1 px-4 py-2 rounded ${selectedMethod === 1 ? "bg-blue-500" : "bg-gray-500"}`}
          onPress={() => setSelectedMethod(1)}
        >
          <Text className="text-white">Islamic Sciences, Karachi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`mx-1 px-4 py-2 rounded ${selectedMethod === 4 ? "bg-blue-500" : "bg-gray-500"}`}
          onPress={() => setSelectedMethod(4)}
        >
          <Text className="text-white">Umm al Qura</Text>
        </TouchableOpacity>
      </View>

      {/* Buttons to select school option */}
      <View className="mt-4 flex-row space-x-4 mx-auto">
        <TouchableOpacity
          className={`mx-1 px-4 py-2 rounded ${school === 0 ? "bg-blue-500" : "bg-gray-500"}`}
          onPress={() => setSchool(0)}
        >
          <Text className="text-white">Shafi School</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`mx-1 px-4 py-2 rounded ${school === 1 ? "bg-blue-500" : "bg-gray-500"}`}
          onPress={() => setSchool(1)}
        >
          <Text className="text-white">Hanafi School</Text>
        </TouchableOpacity>
      </View>

      {/* Display current Karachi time */}
      <View className="mt-6 w-full bg-[#1e2937] p-4 rounded mx-auto">
        {timings && nextPrayerName ? (
          <Text className="text-[#00c871] font-bold text-2xl text-center ">
            Karachi time: {khiTime ? moment(khiTime).format("HH:mm:ss") : ""}
          </Text>
        ) : null}
      </View>

      {/* Display next prayer countdown */}
      <View className="mt-6 w-full bg-[#1e2937] p-4 rounded mx-auto">
        {timings && nextPrayerName ? (
          <Text className="text-[#00c871] font-bold text-2xl text-center ">
            {nextPrayerName} in {formatMs(timeLeftMs)}
          </Text>
        ) : null}
      </View>

      {/* Display Sunrise and Midnight countdowns */}
      <View className="mt-4 w-full bg-[#1e2937] p-4 rounded mx-auto">
        {timings && timings["Sunrise"] ? (
          <Text className="text-[#00c871] font-bold text-2xl text-center">
            Sunrise in {formatMs(sunriseCountdown)}
          </Text>
        ) : null}
        <Text className="text-[#00c871] font-bold text-2xl text-center mt-2">
          Midnight in {formatMs(midnightCountdown)}
        </Text>
      </View>

      {/* Displaying the timings */}
      <View className="my-6 w-full">
        {loading ? (
          <ActivityIndicator size="large" color="#00c871" />
        ) : timings ? (
          Object.entries(timings).map(([key, value]) => (
            <View
              key={key}
              className="flex-row justify-between mb-2 rounded p-2 bg-[#1e2937]"
            >
              <Text className="text-white font-bold text-2xl">{key}</Text>
              <Text className="text-white text-2xl font-bold">
                {convertTo12Hour(value as string)}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-white">No data available.</Text>
        )}
      </View>
    </ScrollView>
  );
}
