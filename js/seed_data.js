// Seed data initialized for first-run offline usage
const SEED_DATA = {
  owner: {
    id: "owner-steve-01",
    name: "Steve",
    email: "steve@example.com",
    phone: "+254700000000"
  },
  ownerDocuments: [
    {
      id: "doc-owner-dl-01",
      ownerId: "owner-steve-01",
      documentType: "driving_licence",
      documentNumber: "DL-KE-982341",
      issueDate: "2023-05-10",
      expiryDate: "2028-05-10",
      notes: "Class B & C endorsement. Clean driving record."
    }
  ],
  vehicles: [
    {
      id: "veh-axio-kcx123a",
      registrationNumber: "KCX 123A",
      make: "Toyota",
      model: "Axio",
      year: 2016,
      fuelType: "petrol",
      engineCapacity: 1500,
      currentOdometer: 158891.0,
      fuelBenchmark: 17.50,
      isActive: true
    },
    {
      id: "veh-fielder-kda456b",
      registrationNumber: "KDA 456B",
      make: "Toyota",
      model: "Fielder",
      year: 2018,
      fuelType: "petrol",
      engineCapacity: 1800,
      currentOdometer: 82450.0,
      fuelBenchmark: 15.80,
      isActive: false
    },
    {
      id: "veh-demio-kcb789c",
      registrationNumber: "KCB 789C",
      make: "Mazda",
      model: "Demio",
      year: 2014,
      fuelType: "petrol",
      engineCapacity: 1300,
      currentOdometer: 114200.0,
      fuelBenchmark: 18.20,
      isActive: false
    }
  ],
  fuelEntries: [
    {
      id: "fe-kcx-318",
      vehicleId: "veh-axio-kcx123a",
      date: "2026-11-15T08:30:00",
      litres: 15.17,
      pricePerLitre: 226.90,
      totalCost: 3442.07,
      tripKm: 253,
      clusterKml: 16.5,
      calculatedKml: 16.68,
      accuracyPercentage: 101.08,
      costPerKm: 13.60,
      stationName: "Rubis Westlands",
      pumpNumber: "P3",
      paymentMethod: "card",
      notes: "Full tank. Smooth run on Waiyaki Way.",
      status: {
        receiptAttached: true,
        paymentVerified: true,
        pumpInfoRecorded: true,
        vehicleReadingsRecorded: true,
        pendingReview: false,
        reviewReason: "",
        overallStatus: "complete"
      }
    },
    {
      id: "fe-kcx-317",
      vehicleId: "veh-axio-kcx123a",
      date: "2026-11-10T17:15:00",
      litres: 32.01,
      pricePerLitre: 226.90,
      totalCost: 7263.07,
      tripKm: 506,
      clusterKml: 15.5,
      calculatedKml: 15.81,
      accuracyPercentage: 101.98,
      costPerKm: 14.35,
      stationName: "TotalEnergies Kimathi",
      pumpNumber: "P1",
      paymentMethod: "card",
      notes: "CBD traffic congestion during evening peak.",
      status: {
        receiptAttached: true,
        paymentVerified: true,
        pumpInfoRecorded: true,
        vehicleReadingsRecorded: true,
        pendingReview: false,
        reviewReason: "",
        overallStatus: "complete"
      }
    },
    {
      id: "fe-kcx-316",
      vehicleId: "veh-axio-kcx123a",
      date: "2026-11-05T09:40:00",
      litres: 13.53,
      pricePerLitre: 224.09,
      totalCost: 3031.94,
      tripKm: 177,
      clusterKml: 14.1,
      calculatedKml: 13.08,
      accuracyPercentage: 92.78,
      costPerKm: 17.13,
      stationName: "Shell Kilimani",
      pumpNumber: "P4",
      paymentMethod: "card",
      notes: "Short urban hops. A/C on full.",
      status: {
        receiptAttached: true,
        paymentVerified: true,
        pumpInfoRecorded: true,
        vehicleReadingsRecorded: true,
        pendingReview: false,
        reviewReason: "",
        overallStatus: "complete"
      }
    },
    {
      id: "fe-kcx-315",
      vehicleId: "veh-axio-kcx123a",
      date: "2026-10-30T12:00:00",
      litres: 31.44,
      pricePerLitre: 224.14,
      totalCost: 7046.96,
      tripKm: 519,
      clusterKml: 16.7,
      calculatedKml: 16.51,
      accuracyPercentage: 98.85,
      costPerKm: 13.58,
      stationName: "Rubis Westlands",
      pumpNumber: "P3",
      paymentMethod: "card",
      notes: "Highway cruise to Naivasha return.",
      status: {
        receiptAttached: true,
        paymentVerified: true,
        pumpInfoRecorded: true,
        vehicleReadingsRecorded: true,
        pendingReview: false,
        reviewReason: "",
        overallStatus: "complete"
      }
    },
    {
      id: "fe-kcx-314",
      vehicleId: "veh-axio-kcx123a",
      date: "2026-10-24T18:20:00",
      litres: 26.76,
      pricePerLitre: 226.87,
      totalCost: 6071.04,
      tripKm: 430,
      clusterKml: 18.2,
      calculatedKml: 16.07,
      accuracyPercentage: 88.29,
      costPerKm: 14.12,
      stationName: "TotalEnergies Kimathi",
      pumpNumber: "P2",
      paymentMethod: "card",
      notes: "Cluster showed 18.2, pump calculated 16.07.",
      status: {
        receiptAttached: true,
        paymentVerified: true,
        pumpInfoRecorded: true,
        vehicleReadingsRecorded: true,
        pendingReview: false,
        reviewReason: "",
        overallStatus: "complete"
      }
    },
    {
      id: "fe-kcx-313",
      vehicleId: "veh-axio-kcx123a",
      date: "2026-10-18T10:10:00",
      litres: 28.62,
      pricePerLitre: 226.87,
      totalCost: 6493.02,
      tripKm: 513,
      clusterKml: 18.4,
      calculatedKml: 17.92,
      accuracyPercentage: 97.42,
      costPerKm: 12.66,
      stationName: "Rubis Westlands",
      pumpNumber: "P3",
      paymentMethod: "card",
      notes: "Thika Road superhighway run.",
      status: {
        receiptAttached: true,
        paymentVerified: true,
        pumpInfoRecorded: true,
        vehicleReadingsRecorded: true,
        pendingReview: false,
        reviewReason: "",
        overallStatus: "complete"
      }
    },
    {
      id: "fe-kcx-312",
      vehicleId: "veh-axio-kcx123a",
      date: "2026-10-10T14:45:00",
      litres: 28.70,
      pricePerLitre: 213.97,
      totalCost: 6140.94,
      tripKm: 480,
      clusterKml: 17.2,
      calculatedKml: 16.72,
      accuracyPercentage: 97.24,
      costPerKm: 12.79,
      stationName: "Shell Kilimani",
      pumpNumber: "P4",
      paymentMethod: "card",
      notes: "V-Power fuel test.",
      status: {
        receiptAttached: true,
        paymentVerified: true,
        pumpInfoRecorded: true,
        vehicleReadingsRecorded: true,
        pendingReview: false,
        reviewReason: "",
        overallStatus: "complete"
      }
    },
    {
      id: "fe-kcx-311",
      vehicleId: "veh-axio-kcx123a",
      date: "2026-10-03T16:30:00",
      litres: 28.57,
      pricePerLitre: 213.97,
      totalCost: 6113.12,
      tripKm: 517,
      clusterKml: 18.6,
      calculatedKml: 18.10,
      accuracyPercentage: 97.29,
      costPerKm: 11.82,
      stationName: "TotalEnergies Kimathi",
      pumpNumber: "P1",
      paymentMethod: "card",
      notes: "Solid 18.10 KM/L performance.",
      status: {
        receiptAttached: true,
        paymentVerified: true,
        pumpInfoRecorded: true,
        vehicleReadingsRecorded: true,
        pendingReview: false,
        reviewReason: "",
        overallStatus: "complete"
      }
    },
    {
      id: "fe-kcx-310",
      vehicleId: "veh-axio-kcx123a",
      date: "2026-09-26T11:20:00",
      litres: 34.27,
      pricePerLitre: 213.77,
      totalCost: 7325.90,
      tripKm: 624,
      clusterKml: 18.9,
      calculatedKml: 18.21,
      accuracyPercentage: 96.34,
      costPerKm: 11.74,
      stationName: "Rubis Westlands",
      pumpNumber: "P3",
      paymentMethod: "card",
      notes: "Long distance tank. 624 km range.",
      status: {
        receiptAttached: true,
        paymentVerified: true,
        pumpInfoRecorded: true,
        vehicleReadingsRecorded: true,
        pendingReview: false,
        reviewReason: "",
        overallStatus: "complete"
      }
    },
    {
      id: "fe-kcx-309",
      vehicleId: "veh-axio-kcx123a",
      date: "2026-09-18T15:10:00",
      litres: 26.44,
      pricePerLitre: 213.99,
      totalCost: 5657.90,
      tripKm: 521,
      clusterKml: 20.0,
      calculatedKml: 19.70,
      accuracyPercentage: 98.52,
      costPerKm: 10.86,
      stationName: "Shell Kilimani",
      pumpNumber: "P2",
      paymentMethod: "card",
      notes: "Near 20 KM/L! Very high efficiency.",
      status: {
        receiptAttached: true,
        paymentVerified: true,
        pumpInfoRecorded: true,
        vehicleReadingsRecorded: true,
        pendingReview: false,
        reviewReason: "",
        overallStatus: "complete"
      }
    }
  ],
  services: [
    {
      id: "srv-axio-01",
      vehicleId: "veh-axio-kcx123a",
      serviceDate: "2026-09-15",
      odometerReading: 155000.0,
      serviceType: "Routine 155k Service",
      category: "engine_oil",
      garage: "AutoCare Westlands",
      partsReplaced: "Toyota 0W-20 Full Synthetic Oil (4L), OEM Filter, Air Filter Clean",
      labourCost: 1500.0,
      partsCost: 6500.0,
      totalCost: 8000.0,
      notes: "Checked brake pads (approx 65% remaining)."
    }
  ],
  reminders: [
    {
      id: "rem-axio-oil",
      vehicleId: "veh-axio-kcx123a",
      title: "Engine Oil & Filter Service",
      category: "engine_oil",
      intervalKm: 5000.0,
      intervalMonths: 6,
      lastServiceOdometer: 155000.0,
      lastServiceDate: "2026-09-15",
      dueOdometer: 160000.0,
      dueDate: "2027-03-15",
      status: "active"
    },
    {
      id: "rem-axio-brakes",
      vehicleId: "veh-axio-kcx123a",
      title: "Brake Pads & Fluid Inspection",
      category: "brake_pads",
      intervalKm: 10000.0,
      intervalMonths: 6,
      lastServiceOdometer: 150000.0,
      lastServiceDate: "2026-06-10",
      dueOdometer: 160000.0,
      dueDate: "2026-12-10",
      status: "active"
    }
  ],
  vehicleDocuments: [
    {
      id: "doc-axio-ins-01",
      vehicleId: "veh-axio-kcx123a",
      documentType: "insurance",
      provider: "APA Insurance",
      documentNumber: "POL-APA-2026-9921",
      startDate: "2026-01-01",
      expiryDate: "2026-12-31",
      notes: "Comprehensive private motor vehicle coverage."
    },
    {
      id: "doc-axio-insp-01",
      vehicleId: "veh-axio-kcx123a",
      documentType: "inspection",
      provider: "NTSA Motor Inspection",
      documentNumber: "CERT-INSP-2026-4412",
      startDate: "2026-03-15",
      expiryDate: "2027-03-14",
      notes: "Annual roadworthiness certificate."
    }
  ],
  expenses: [
    {
      id: "exp-axio-01",
      vehicleId: "veh-axio-kcx123a",
      expenseDate: "2026-11-10",
      category: "tolls",
      amount: 360.0,
      notes: "Nairobi Expressway Westlands to JKIA"
    },
    {
      id: "exp-axio-02",
      vehicleId: "veh-axio-kcx123a",
      expenseDate: "2026-11-05",
      category: "cleaning",
      amount: 500.0,
      notes: "Full exterior pressure wash & interior vacuum"
    },
    {
      id: "exp-axio-03",
      vehicleId: "veh-axio-kcx123a",
      expenseDate: "2026-11-02",
      category: "parking",
      amount: 300.0,
      notes: "Nairobi CBD county automated parking"
    }
  ]
};

