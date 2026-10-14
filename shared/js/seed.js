/* NEXUS — demo seed data.
   Dates are generated relative to today so the demo never looks stale.
   Demo accounts (password for all: Demo1234):
     user@nexus.demo · expert@nexus.demo · owner@nexus.demo · company@nexus.demo · admin@nexus.demo */
(function () {
  "use strict";
  const NX = window.NX;
  const PASS = "Demo1234";
  const WORKSPACE_COMMISSION = 14;
  const EXPERT_COMMISSION = 8;
  const DAY = 86400000;
  const money = (n) => Math.round(n * 100) / 100;

  NX.DEMO_PASSWORD = PASS;
  NX.DEMO_ACCOUNTS = {
    user: "user@nexus.demo",
    expert: "expert@nexus.demo",
    owner: "owner@nexus.demo",
    company: "company@nexus.demo",
    admin: "admin@nexus.demo",
  };

  NX.buildSeed = function () {
    const ph = NX.hash(PASS);
    const at = (days, hour) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(hour == null ? 10 : hour, 0, 0, 0);
      return d.getTime();
    };
    const iso = NX.isoOffset;
    const rnd = (function (seed) {
      let s = seed;
      return () => (s = (s * 9301 + 49297) % 233280) / 233280;
    })(7);

    /* ---------- accounts ---------- */
    const users = [
      {
        id: "u1",
        name: "Sara Haddad",
        email: "user@nexus.demo",
        role: "user",
        ph,
        phone: "+962 79 555 0101",
        city: "Amman",
        bio: "Product designer working between Amman cafés and coworking desks.",
        status: "active",
        created: at(-60),
      },
      {
        id: "u2",
        name: "Omar Nasser",
        email: "omar.nasser@example.com",
        role: "user",
        ph,
        phone: "+962 78 555 0142",
        city: "Amman",
        bio: "",
        status: "active",
        created: at(-48),
      },
      {
        id: "u3",
        name: "Lina Qasem",
        email: "lina.qasem@example.com",
        role: "user",
        ph,
        phone: "",
        city: "Irbid",
        bio: "",
        status: "active",
        created: at(-40),
      },
      {
        id: "u4",
        name: "Rami Abu‑Zeid",
        email: "rami.abuzeid@example.com",
        role: "user",
        ph,
        phone: "",
        city: "Aqaba",
        bio: "",
        status: "active",
        created: at(-22),
      },
      {
        id: "u5",
        name: "Hala Khoury",
        email: "hala.khoury@example.com",
        role: "user",
        ph,
        phone: "",
        city: "Amman",
        bio: "",
        status: "suspended",
        created: at(-15),
      },
      {
        id: "u6",
        name: "Ahmad Al‑Khatib",
        email: "expert@nexus.demo",
        role: "expert",
        ph,
        phone: "+962 79 555 0166",
        city: "Amman",
        expertId: "e1",
        status: "active",
        created: at(-90),
      },
      {
        id: "u7",
        name: "Nadia Salem",
        email: "owner@nexus.demo",
        role: "owner",
        ph,
        phone: "+962 79 555 0177",
        city: "Amman",
        bio: "Runs two coworking spaces in Amman.",
        status: "active",
        created: at(-120),
      },
      {
        id: "u8",
        name: "Fadi Mansour",
        email: "owner2@nexus.demo",
        role: "owner",
        ph,
        phone: "+962 77 555 0188",
        city: "Amman",
        bio: "",
        status: "active",
        created: at(-75),
      },
      {
        id: "u9",
        name: "Reem Tarawneh",
        email: "owner3@nexus.demo",
        role: "owner",
        ph,
        phone: "+962 77 555 0199",
        city: "Irbid",
        bio: "",
        status: "active",
        created: at(-70),
      },
      {
        id: "u10",
        name: "Yousef Barakat",
        email: "company@nexus.demo",
        role: "company",
        ph,
        phone: "+962 6 555 0120",
        city: "Amman",
        companyId: "c1",
        status: "active",
        created: at(-80),
      },
      {
        id: "u11",
        name: "Noor Ghanem",
        email: "admin@nexus.demo",
        role: "admin",
        ph,
        phone: "",
        city: "Amman",
        status: "active",
        created: at(-200),
      },
    ];

    const companies = [
      {
        id: "c1",
        name: "Orbit Technologies",
        email: "company@nexus.demo",
        industry: "Software",
        size: "11–50",
        city: "Amman",
        taxId: "JO‑2038841",
        website: "orbit.example",
        monthlyBudget: 600,
        status: "approved",
        created: at(-80),
        team: [
          {
            id: "m1",
            name: "Yousef Barakat",
            email: "company@nexus.demo",
            title: "Operations lead",
            admin: true,
          },
          {
            id: "m2",
            name: "Dalia Hamdan",
            email: "dalia@orbit.example",
            title: "Frontend engineer",
            admin: false,
          },
          {
            id: "m3",
            name: "Zaid Odeh",
            email: "zaid@orbit.example",
            title: "Backend engineer",
            admin: false,
          },
          {
            id: "m4",
            name: "Maysa Rimawi",
            email: "maysa@orbit.example",
            title: "Product manager",
            admin: false,
          },
        ],
      },
      {
        id: "c2",
        name: "Blue Ridge Consulting",
        email: "info@blueridge.example",
        industry: "Consulting",
        size: "1–10",
        city: "Aqaba",
        taxId: "JO‑5512093",
        website: "blueridge.example",
        monthlyBudget: 250,
        status: "pending",
        created: at(-2),
        team: [],
      },
    ];

    /* ---------- spaces ---------- */
    const owners = {
      s1: "owner@nexus.demo",
      s2: "owner@nexus.demo",
      s3: "owner2@nexus.demo",
      s4: "owner2@nexus.demo",
      s5: "owner3@nexus.demo",
      s6: "owner3@nexus.demo",
    };
    const blurbs = {
      s1: "A bright, quiet-first floor in Jubeiha with a social corner by the coffee bar. Popular with freelancers and small teams.",
      s2: "Boutique workspace in Shmeisani with a glass meeting room and free parking for members.",
      s3: "24/7 access hive in Sweifieh — ideal for night owls, students and remote developers.",
      s4: "Calm corner space in Abdoun with private parking and a relaxed lounge.",
      s5: "Affordable workshop floor near the universities in Irbid, with printing and a meeting room.",
      s6: "Sea-breeze desks in Aqaba, open round the clock with meeting rooms for client calls.",
    };
    const spaces = SPACES.map((s) => {
      const copy = JSON.parse(JSON.stringify(s));
      delete copy.owner;
      return Object.assign(copy, {
        ownerEmail: owners[s.id],
        status: "approved",
        paused: false,
        instant: !(s.id === "s3" || s.id === "s4"),
        description: blurbs[s.id],
        address: s.area + ", " + s.city,
        hours: s.am.includes("h24") ? "Open 24/7" : "Sun–Thu 08:00–20:00",
        created: at(-100),
      });
    });
    const s7 = {
      id: "s7",
      name: "Madaba Studio",
      area: "Old Town",
      city: "Madaba",
      price: 6,
      hourlyPrice: 1.25,
      desks: 8,
      quiet: 0.5,
      rating: null,
      hue: 28,
      am: ["wifi", "coffee"],
      load: 0,
      ownerEmail: "owner2@nexus.demo",
      status: "pending",
      paused: false,
      instant: true,
      isNew: true,
      description:
        "A small creative studio in Madaba's old town with fast Wi‑Fi and a coffee corner.",
      address: "Old Town, Madaba",
      hours: "Sun–Thu 09:00–18:00",
      created: at(-1),
    };
    buildPlan(s7, 77);
    spaces.push(s7);

    /* ---------- experts ---------- */
    const bios = {
      e1: "I design databases and build .NET systems for startups and SMEs. I like practical sessions: bring your schema or your slow query and we fix it together.",
      e2: "Architect of distributed systems with a focus on reliability. Happy to review designs and trade-offs.",
    };
    const times = (e) => {
      const set = [];
      e.slots.forEach((t) => {
        const m = /(\d{2}:\d{2})/.exec(t);
        if (m && !set.includes(m[1])) set.push(m[1]);
      });
      return set.sort();
    };
    const experts = EXPERTS.map((e) => {
      const c = JSON.parse(JSON.stringify(e));
      delete c.slots;
      return Object.assign(c, {
        email: e.id === "e1" ? "expert@nexus.demo" : e.id + "@experts.nexus.demo",
        status: "approved",
        bio:
          bios[e.id] || e.why + ". Sessions are focused, practical and tailored to your situation.",
        languages: ["Arabic", "English"],
        city: e.spaceId ? "Amman" : "Amman",
        avail: { days: [0, 1, 2, 3, 4], times: times(e) },
        created: at(-90),
      });
    });
    experts.push({
      id: "e13",
      name: "Dina Haddad",
      title: "Startup legal advisor",
      skills: ["legal", "strategy"],
      rating: null,
      n: 0,
      rate: 38,
      modes: ["online", "inperson"],
      email: "e13@experts.nexus.demo",
      status: "pending",
      why: "Contracts, company registration and IP for early-stage founders",
      bio: "Lawyer helping founders with contracts, company registration and trademarks.",
      languages: ["Arabic", "English"],
      city: "Amman",
      avail: { days: [0, 1, 2, 3], times: ["10:00", "14:00"] },
      created: at(-1),
    });

    /* ---------- bookings + wallet ledger ---------- */
    const bookings = [];
    const tx = [];
    const priceOf = (id) => spaces.find((s) => s.id === id).price;
    let bn = 1000;
    let tn = 5000;
    const mkBooking = (o) => {
      const fee = money(priceOf(o.spaceId) * o.deskIds.length);
      const b = Object.assign(
        {
          id: "B-" + ++bn,
          kind: "space",
          fee,
          cut: money((fee * WORKSPACE_COMMISSION) / 100),
          rate: WORKSPACE_COMMISSION,
          method: "card",
          createdAt: at(-3),
        },
        o,
      );
      bookings.push(b);
      if (b.method === "wallet") {
        tx.push({
          id: "T-" + ++tn,
          email: b.walletEmail,
          type: "booking",
          amount: -b.fee,
          desc: "Desk booking · " + spaces.find((s) => s.id === b.spaceId).name,
          ref: b.id,
          method: "wallet",
          at: b.createdAt,
        });
        if (b.status === "cancelled")
          tx.push({
            id: "T-" + ++tn,
            email: b.walletEmail,
            type: "refund",
            amount: b.fee,
            desc: "Refund · " + b.id,
            ref: b.id,
            method: "wallet",
            at: b.createdAt + DAY,
          });
      }
      return b;
    };

    tx.push({
      id: "T-" + ++tn,
      email: "user@nexus.demo",
      type: "topup",
      amount: 150,
      desc: "Demo wallet sample funds",
      ref: "",
      method: "wallet",
      at: at(-30),
    });
    tx.push({
      id: "T-" + ++tn,
      email: "company@nexus.demo",
      type: "topup",
      amount: 900,
      desc: "Wallet top-up (demo bank transfer)",
      ref: "",
      method: "transfer",
      at: at(-45),
    });

    const U = (extra) =>
      Object.assign(
        {
          userEmail: "user@nexus.demo",
          bookedBy: "Sara Haddad",
          payer: "user",
          walletEmail: "user@nexus.demo",
          method: "wallet",
        },
        extra,
      );
    mkBooking(
      U({ spaceId: "s1", deskIds: ["T06"], date: iso(0), status: "confirmed", createdAt: at(-1) }),
    );
    mkBooking(
      U({ spaceId: "s1", deskIds: ["T05"], date: iso(2), status: "confirmed", createdAt: at(-1) }),
    );
    mkBooking(
      U({
        spaceId: "s2",
        deskIds: ["T02", "T03"],
        date: iso(-6),
        status: "completed",
        createdAt: at(-9),
      }),
    );
    mkBooking(
      U({
        spaceId: "s1",
        deskIds: ["T09"],
        date: iso(-14),
        status: "completed",
        createdAt: at(-16),
      }),
    );
    mkBooking(
      U({ spaceId: "s4", deskIds: ["T01"], date: iso(-3), status: "cancelled", createdAt: at(-8) }),
    );
    mkBooking(
      U({ spaceId: "s3", deskIds: ["T04"], date: iso(5), status: "pending", createdAt: at(0, 9) }),
    );

    const C = (who, extra) =>
      Object.assign(
        {
          userEmail: "company@nexus.demo",
          companyId: "c1",
          bookedBy: who,
          payer: "company",
          walletEmail: "company@nexus.demo",
          method: "wallet",
        },
        extra,
      );
    mkBooking(
      C("Dalia Hamdan", {
        spaceId: "s1",
        deskIds: ["T02", "T03", "T04"],
        date: iso(3),
        status: "confirmed",
        createdAt: at(-2),
      }),
    );
    mkBooking(
      C("Zaid Odeh", {
        spaceId: "s2",
        deskIds: ["T05"],
        date: iso(-4),
        status: "completed",
        createdAt: at(-8),
      }),
    );
    mkBooking(
      C("Maysa Rimawi", {
        spaceId: "s6",
        deskIds: ["T01", "T02"],
        date: iso(-11),
        status: "completed",
        createdAt: at(-14),
      }),
    );
    mkBooking(
      C("Yousef Barakat", {
        spaceId: "s4",
        deskIds: ["T06"],
        date: iso(-19),
        status: "completed",
        createdAt: at(-22),
      }),
    );
    mkBooking(
      C("Dalia Hamdan", {
        spaceId: "s3",
        deskIds: ["T07"],
        date: iso(7),
        status: "pending",
        createdAt: at(0, 8),
      }),
    );
    mkBooking(
      C("Zaid Odeh", {
        spaceId: "s1",
        deskIds: ["T07"],
        date: iso(-27),
        status: "completed",
        createdAt: at(-30),
      }),
    );

    /* background activity from other members so owner and admin dashboards have history */
    const crowd = [
      "omar.nasser@example.com|Omar Nasser",
      "lina.qasem@example.com|Lina Qasem",
      "rami.abuzeid@example.com|Rami Abu‑Zeid",
      "hala.khoury@example.com|Hala Khoury",
    ];
    for (let i = 0; i < 34; i++) {
      const sp = spaces[Math.floor(rnd() * 6)];
      const who = crowd[Math.floor(rnd() * crowd.length)].split("|");
      const off = Math.floor(rnd() * 44) - 36;
      const n = 1 + Math.floor(rnd() * 2);
      const used = bookings
        .filter((b) => b.spaceId === sp.id && b.date === iso(off))
        .flatMap((b) => b.deskIds);
      const desks = [];
      for (let k = 1; desks.length < n && k <= sp.desks; k++) {
        const id = "T" + String(k + 8).padStart(2, "0");
        if (
          k + 8 <= sp.desks &&
          !used.includes(id) &&
          !(sp.plan || []).some((d) => d.id === id && d.base)
        )
          desks.push(id);
      }
      if (!desks.length) continue;
      const bad = rnd() < 0.08;
      mkBooking({
        spaceId: sp.id,
        deskIds: desks,
        date: iso(off),
        userEmail: who[0],
        bookedBy: who[1],
        payer: "user",
        status: off < 0 ? (bad ? "cancelled" : "completed") : sp.instant ? "confirmed" : "pending",
        createdAt: at(off - 2),
      });
    }

    /* ---------- consultations ---------- */
    const consultations = [];
    let cn = 2000;
    const mkConsult = (o) => {
      const e = experts.find((x) => x.id === o.expertId);
      const baseFee = money(e.rate);
      const commission = money((baseFee * EXPERT_COMMISSION) / 100);
      const fee = money(baseFee + commission);
      const c = Object.assign(
        {
          id: "C-" + ++cn,
          baseFee,
          commission,
          fee,
          cut: commission,
          rate: EXPERT_COMMISSION,
          mode: "online",
          notes: "",
          createdAt: at(-2),
          payer: "user",
          method: "wallet",
        },
        o,
      );
      c.paymentStatus =
        c.paymentStatus ||
        (["confirmed", "completed"].includes(c.status)
          ? c.method === "card"
            ? "demo_success"
            : "paid"
          : c.status === "cancelled" && c.method === "wallet"
            ? "refunded"
            : "not_started");
      consultations.push(c);
      if (c.method === "wallet" && c.walletEmail && ["paid", "refunded"].includes(c.paymentStatus)) {
        tx.push({
          id: "T-" + ++tn,
          email: c.walletEmail,
          type: "consultation",
          amount: -c.fee,
          desc: "Expert session · " + e.name,
          ref: c.id,
          method: "wallet",
          at: c.createdAt,
        });
        if (c.paymentStatus === "refunded")
          tx.push({
            id: "T-" + ++tn,
            email: c.walletEmail,
            type: "refund",
            amount: c.fee,
            desc: "Refund · " + c.id,
            ref: c.id,
            method: "wallet",
            at: c.createdAt + DAY,
          });
      }
    };
    const SU = (x) =>
      Object.assign(
        { userEmail: "user@nexus.demo", bookedBy: "Sara Haddad", walletEmail: "user@nexus.demo" },
        x,
      );
    mkConsult(
      SU({
        expertId: "e1",
        date: iso(-8),
        time: "16:00",
        mode: "space",
        spaceId: "s1",
        topic: "Database design for my booking app",
        status: "completed",
        createdAt: at(-10),
      }),
    );
    mkConsult(
      SU({
        expertId: "e1",
        date: iso(1),
        time: "17:30",
        mode: "online",
        topic: "Query performance review",
        status: "confirmed",
        createdAt: at(-1),
      }),
    );
    mkConsult(
      SU({
        expertId: "e5",
        date: iso(4),
        time: "16:30",
        mode: "online",
        topic: "Brand identity feedback",
        status: "requested",
        createdAt: at(0, 8),
      }),
    );
    mkConsult({
      expertId: "e1",
      date: iso(2),
      time: "11:00",
      mode: "online",
      topic: "EF Core migrations strategy",
      status: "requested",
      userEmail: "omar.nasser@example.com",
      bookedBy: "Omar Nasser",
      createdAt: at(0, 7),
      method: "card",
    });
    mkConsult({
      expertId: "e1",
      date: iso(-15),
      time: "16:00",
      mode: "online",
      topic: "Schema review",
      status: "completed",
      userEmail: "lina.qasem@example.com",
      bookedBy: "Lina Qasem",
      createdAt: at(-17),
      method: "card",
    });
    mkConsult({
      expertId: "e1",
      date: iso(-21),
      time: "17:30",
      mode: "space",
      spaceId: "s1",
      topic: "Reporting database",
      status: "completed",
      userEmail: "rami.abuzeid@example.com",
      bookedBy: "Rami Abu‑Zeid",
      createdAt: at(-23),
      method: "card",
    });
    mkConsult({
      expertId: "e1",
      date: iso(3),
      time: "16:00",
      mode: "online",
      topic: "API design workshop for our team",
      status: "confirmed",
      userEmail: "company@nexus.demo",
      companyId: "c1",
      bookedBy: "Zaid Odeh",
      payer: "company",
      walletEmail: "company@nexus.demo",
      createdAt: at(-1),
    });
    mkConsult({
      expertId: "e1",
      date: iso(-5),
      time: "17:30",
      mode: "online",
      topic: "Cancelled — schedule clash",
      status: "cancelled",
      userEmail: "hala.khoury@example.com",
      bookedBy: "Hala Khoury",
      createdAt: at(-7),
      method: "card",
    });
    mkConsult({
      expertId: "e4",
      date: iso(-12),
      time: "12:00",
      mode: "online",
      topic: "Pricing strategy for our SaaS plan",
      status: "completed",
      userEmail: "company@nexus.demo",
      companyId: "c1",
      bookedBy: "Maysa Rimawi",
      payer: "company",
      walletEmail: "company@nexus.demo",
      createdAt: at(-14),
    });
    mkConsult({
      expertId: "e3",
      date: iso(-9),
      time: "15:00",
      mode: "online",
      topic: "Growth channels",
      status: "completed",
      userEmail: "omar.nasser@example.com",
      bookedBy: "Omar Nasser",
      createdAt: at(-12),
      method: "card",
    });
    mkConsult({
      expertId: "e2",
      date: iso(-20),
      time: "17:00",
      mode: "online",
      topic: "Service boundaries",
      status: "completed",
      userEmail: "lina.qasem@example.com",
      bookedBy: "Lina Qasem",
      createdAt: at(-22),
      method: "card",
    });

    /* ---------- service tickets (requests from a desk) ---------- */
    const tickets = [
      {
        id: 101,
        spaceId: "s1",
        deskId: "T03",
        type: "wifi",
        note: "Connection drops every few minutes",
        status: "progress",
        userEmail: "omar.nasser@example.com",
        at: at(-1),
      },
      {
        id: 102,
        spaceId: "s1",
        deskId: "T07",
        type: "projector",
        note: "",
        status: "new",
        userEmail: "lina.qasem@example.com",
        at: at(0, 9),
      },
      {
        id: 103,
        spaceId: "s1",
        deskId: "T05",
        type: "hospitality",
        note: "Two coffees please",
        status: "done",
        userEmail: "user@nexus.demo",
        at: at(-14),
      },
      {
        id: 104,
        spaceId: "s2",
        deskId: "T02",
        type: "printing",
        note: "20 pages A4",
        status: "done",
        userEmail: "user@nexus.demo",
        at: at(-6),
      },
    ];

    /* ---------- payouts ---------- */
    const payouts = [
      {
        id: "P-3001",
        email: "owner@nexus.demo",
        name: "Nadia Salem",
        role: "owner",
        amount: 40,
        method: "Bank transfer ••1204",
        status: "paid",
        at: at(-20),
        resolvedAt: at(-18),
        note: "",
      },
      {
        id: "P-3002",
        email: "owner@nexus.demo",
        name: "Nadia Salem",
        role: "owner",
        amount: 25,
        method: "Bank transfer ••1204",
        status: "requested",
        at: at(-1),
        resolvedAt: null,
        note: "",
      },
      {
        id: "P-3003",
        email: "expert@nexus.demo",
        name: "Ahmad Al‑Khatib",
        role: "expert",
        amount: 30,
        method: "Bank transfer ••8832",
        status: "paid",
        at: at(-16),
        resolvedAt: at(-14),
        note: "",
      },
      {
        id: "P-3004",
        email: "expert@nexus.demo",
        name: "Ahmad Al‑Khatib",
        role: "expert",
        amount: 15,
        method: "Bank transfer ••8832",
        status: "requested",
        at: at(0, 8),
        resolvedAt: null,
        note: "",
      },
      {
        id: "P-3005",
        email: "owner2@nexus.demo",
        name: "Fadi Mansour",
        role: "owner",
        amount: 20,
        method: "Bank transfer ••5530",
        status: "requested",
        at: at(-2),
        resolvedAt: null,
        note: "",
      },
      {
        id: "P-3006",
        email: "owner3@nexus.demo",
        name: "Reem Tarawneh",
        role: "owner",
        amount: 12,
        method: "Bank transfer ••7719",
        status: "rejected",
        at: at(-9),
        resolvedAt: at(-8),
        note: "Bank details did not match the account holder.",
      },
    ];

    /* ---------- approvals ---------- */
    const approvals = [
      {
        id: "A-4001",
        type: "space",
        refId: "s7",
        title: "Madaba Studio",
        subtitle: "New workspace · 8 desks · 6 JOD/day",
        submittedBy: "Fadi Mansour",
        email: "owner2@nexus.demo",
        at: at(-1),
        status: "pending",
        decidedAt: null,
        note: "",
      },
      {
        id: "A-4002",
        type: "expert",
        refId: "e13",
        title: "Dina Haddad",
        subtitle: "Expert profile · Startup legal advisor",
        submittedBy: "Dina Haddad",
        email: "e13@experts.nexus.demo",
        at: at(-1),
        status: "pending",
        decidedAt: null,
        note: "",
      },
      {
        id: "A-4003",
        type: "company",
        refId: "c2",
        title: "Blue Ridge Consulting",
        subtitle: "Company account · Consulting · Aqaba",
        submittedBy: "info@blueridge.example",
        email: "info@blueridge.example",
        at: at(-2),
        status: "pending",
        decidedAt: null,
        note: "",
      },
      {
        id: "A-4004",
        type: "space",
        refId: "s6",
        title: "Aqaba Gate",
        subtitle: "New workspace · 10 desks",
        submittedBy: "Reem Tarawneh",
        email: "owner3@nexus.demo",
        at: at(-60),
        status: "approved",
        decidedAt: at(-58),
        note: "Photos and licence verified.",
      },
      {
        id: "A-4005",
        type: "expert",
        refId: "e12",
        title: "Maha Al‑Rifai",
        subtitle: "Expert profile · Small business growth",
        submittedBy: "Maha Al‑Rifai",
        email: "e12@experts.nexus.demo",
        at: at(-70),
        status: "approved",
        decidedAt: at(-69),
        note: "",
      },
    ];

    /* ---------- feedback ---------- */
    const feedback = [
      {
        id: "F-6001",
        kind: "space",
        refId: "B-1003",
        targetId: "s1",
        from: "user@nexus.demo",
        fromName: "Sara Haddad",
        role: "user",
        rating: 5,
        tags: ["Quiet", "Great Wi‑Fi"],
        text: "Perfect focus day. The quiet zone is exactly as described.",
        at: at(-13),
      },
      {
        id: "F-6002",
        kind: "space",
        refId: "B-1007",
        targetId: "s1",
        from: "company@nexus.demo",
        fromName: "Zaid Odeh",
        role: "company",
        rating: 4,
        tags: ["Friendly staff"],
        text: "Good for a small team day. Meeting room was booked out though.",
        at: at(-26),
      },
      {
        id: "F-6003",
        kind: "expert",
        refId: "C-2005",
        targetId: "e1",
        from: "lina.qasem@example.com",
        fromName: "Lina Qasem",
        role: "user",
        rating: 5,
        tags: ["Clear explanations", "On time"],
        text: "Fixed our schema in one session.",
        at: at(-14),
      },
      {
        id: "F-6004",
        kind: "expert",
        refId: "C-2006",
        targetId: "e1",
        from: "rami.abuzeid@example.com",
        fromName: "Rami Abu‑Zeid",
        role: "user",
        rating: 4,
        tags: ["Practical"],
        text: "Very practical advice, a little rushed at the end.",
        at: at(-20),
      },
      {
        id: "F-6005",
        kind: "space",
        refId: "B-1008",
        targetId: "s2",
        from: "company@nexus.demo",
        fromName: "Zaid Odeh",
        role: "company",
        rating: 5,
        tags: ["Great Wi‑Fi", "Comfortable"],
        text: "Best space we've tried in Shmeisani.",
        at: at(-3),
      },
      {
        id: "F-6006",
        kind: "platform",
        refId: "",
        targetId: "",
        from: "user@nexus.demo",
        fromName: "Sara Haddad",
        role: "user",
        rating: 5,
        tags: ["Easy to use"],
        text: "Booking a desk takes less than a minute.",
        at: at(-20),
      },
    ];

    /* ---------- messaging ---------- */
    const P = (email, name, role) => ({ email, name, role });
    const M = (from, text, days, hour) => ({
      id: "m" + Math.random().toString(36).slice(2, 8),
      from,
      text,
      at: at(days, hour),
    });
    const threads = [
      {
        id: "th1",
        subject: "Desk T05 on Friday",
        participants: [
          P("user@nexus.demo", "Sara Haddad", "user"),
          P("owner@nexus.demo", "Nadia Salem", "owner"),
        ],
        ctx: { type: "space", refId: "s1" },
        reads: { "owner@nexus.demo": at(-1, 15) },
        messages: [
          M("user@nexus.demo", "Hi! Is there a power outlet close to desk T05?", -1, 9),
          M(
            "owner@nexus.demo",
            "Hello Sara — yes, every desk in the quiet zone has two outlets and a USB‑C port.",
            -1,
            11,
          ),
          M(
            "user@nexus.demo",
            "Perfect, thank you. Is the coffee bar included for members?",
            -1,
            12,
          ),
          M(
            "owner@nexus.demo",
            "Filter coffee and tea are free. Specialty drinks are on the menu at the bar.",
            0,
            8,
          ),
        ],
      },
      {
        id: "th2",
        subject: "Query performance review",
        participants: [
          P("user@nexus.demo", "Sara Haddad", "user"),
          P("expert@nexus.demo", "Ahmad Al‑Khatib", "expert"),
        ],
        ctx: { type: "consultation", refId: "C-2002" },
        reads: { "expert@nexus.demo": at(0, 7) },
        messages: [
          M(
            "user@nexus.demo",
            "Hi Ahmad, I'll bring the slow report query tomorrow. Anything I should prepare?",
            0,
            7,
          ),
          M(
            "expert@nexus.demo",
            "Great. Please export the execution plan and the table definitions if you can.",
            0,
            9,
          ),
        ],
      },
      {
        id: "th3",
        subject: "Team day on Thursday",
        participants: [
          P("company@nexus.demo", "Orbit Technologies", "company"),
          P("owner@nexus.demo", "Nadia Salem", "owner"),
        ],
        ctx: { type: "space", refId: "s1" },
        reads: { "company@nexus.demo": at(-2, 18), "owner@nexus.demo": at(-2, 17) },
        messages: [
          M(
            "company@nexus.demo",
            "We would like the meeting room for 3 hours with our 3 desks. Is that possible?",
            -3,
            10,
          ),
          M(
            "owner@nexus.demo",
            "Yes, the meeting room is free on Thursday afternoon. I'll reserve it for you.",
            -3,
            13,
          ),
          M("company@nexus.demo", "Wonderful, thanks.", -2, 9),
        ],
      },
      {
        id: "th4",
        subject: "API design workshop",
        participants: [
          P("company@nexus.demo", "Orbit Technologies", "company"),
          P("expert@nexus.demo", "Ahmad Al‑Khatib", "expert"),
        ],
        ctx: { type: "consultation", refId: "C-2007" },
        reads: { "company@nexus.demo": at(-1, 10) },
        messages: [
          M(
            "company@nexus.demo",
            "Hello Ahmad, our team of four would like to join the session. Is that fine?",
            -1,
            8,
          ),
          M(
            "expert@nexus.demo",
            "Absolutely, send me the API spec beforehand so we can use the time well.",
            -1,
            9,
          ),
        ],
      },
      {
        id: "th5",
        subject: "Madaba Studio listing review",
        participants: [
          P("owner2@nexus.demo", "Fadi Mansour", "owner"),
          P("admin@nexus.demo", "Noor Ghanem", "admin"),
        ],
        ctx: { type: "approval", refId: "A-4001" },
        reads: { "admin@nexus.demo": at(-1, 12) },
        messages: [
          M(
            "owner2@nexus.demo",
            "I submitted Madaba Studio yesterday. Do you need more photos?",
            -1,
            11,
          ),
        ],
      },
      {
        id: "th6",
        subject: "Profile verification",
        participants: [
          P("expert@nexus.demo", "Ahmad Al‑Khatib", "expert"),
          P("admin@nexus.demo", "Noor Ghanem", "admin"),
        ],
        ctx: {},
        reads: { "expert@nexus.demo": at(-30, 12), "admin@nexus.demo": at(-30, 12) },
        messages: [
          M(
            "admin@nexus.demo",
            "Welcome to NEXUS Ahmad — your expert profile is verified.",
            -90,
            10,
          ),
          M("expert@nexus.demo", "Thank you!", -90, 11),
        ],
      },
      {
        id: "th7",
        subject: "Before our session",
        participants: [
          P("omar.nasser@example.com", "Omar Nasser", "user"),
          P("expert@nexus.demo", "Ahmad Al‑Khatib", "expert"),
        ],
        ctx: { type: "consultation", refId: "C-2004" },
        reads: {},
        messages: [
          M("omar.nasser@example.com", "Hi Ahmad, can we move the session 30 minutes later?", 0, 6),
        ],
      },
    ];

    /* ---------- misc ---------- */
    const support = [
      {
        id: "S-7001",
        email: "user@nexus.demo",
        name: "Sara Haddad",
        role: "user",
        category: "Billing",
        subject: "Invoice for booking B-1003",
        message: "Could I get a VAT invoice for last month's booking?",
        status: "open",
        at: at(-2),
        reply: "",
      },
      {
        id: "S-7002",
        email: "owner2@nexus.demo",
        name: "Fadi Mansour",
        role: "owner",
        category: "Listings",
        subject: "Change desk count",
        message: "How do I add more desks to Abdoun Corner?",
        status: "resolved",
        at: at(-12),
        reply:
          "Open Space Inventory → Edit listing and change the desk count. Changes to approved listings are applied immediately.",
      },
    ];
    const favorites = {
      "user@nexus.demo": { spaces: ["s2", "s6"], experts: ["e1", "e5"] },
      "company@nexus.demo": { spaces: ["s1"], experts: ["e4"] },
    };
    const settings = {
      commission: EXPERT_COMMISSION,
      workspaceCommission: WORKSPACE_COMMISSION,
      expertCommission: EXPERT_COMMISSION,
      minPayout: 10,
      currency: "JOD",
      maintenance: false,
      allowSignups: true,
      cancelHours: 24,
      bookingWindow: 30,
      supportEmail: "hello@nexus.jo",
      payoutDay: "Sunday",
    };
    const prefs = {};
    const audit = [
      {
        id: "L-1",
        at: at(-1, 11),
        actor: "owner2@nexus.demo",
        action: "Submitted listing",
        detail: "Madaba Studio",
      },
      {
        id: "L-2",
        at: at(-2, 9),
        actor: "info@blueridge.example",
        action: "Registered company",
        detail: "Blue Ridge Consulting",
      },
      {
        id: "L-3",
        at: at(-8, 14),
        actor: "admin@nexus.demo",
        action: "Rejected payout",
        detail: "P-3006",
      },
    ];

    return {
      users,
      companies,
      spaces,
      experts,
      bookings,
      consultations,
      tickets,
      transactions: tx,
      payouts,
      approvals,
      feedback,
      threads,
      support,
      favorites,
      settings,
      prefs,
      audit,
    };
  };
})();
