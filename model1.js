/** Model 1:
  * - Every car starts moving in same acceleration and its velocity is capped
  *   so they don't collide.
  * - A car can't move if the car in front of it is not moving.
  * - We added uniform delay to each car to start moving to give the driver
  *   some time to react).
  */

function simulateModel1({
  trafficLightGreenDurationSeconds = 15,
  numCars = 100,
  seed = 1337,
  carLengthMeters = 5,
  betweenCarsLengthMeters = 2,
  maxVelocityMPS = 10,
  accelerationMPS2 = 2.5,
}) {
  var sim = new Sim();
  var random = new Random();

  var trafficLight = new Sim.Event("Traffic Light");
  var cars = Array(numCars).fill().map((_, i) => new Sim.Event(`Car #${i}`));

  var LightController = {
    start: function() {
      trafficLight.fire(true);
      sim.log("Traffic light is green");
    }
  }

  let numCarCrossed = 0;

  var carsStats = new Sim.Population("Cars that are waiting to pass the intersection");
  const timeNeededToReachMaxVelocity = maxVelocityMPS / accelerationMPS2;
  const distanceTravelledToReachMaxVelocity = 0.5 * accelerationMPS2 + squared(timeNeededToReachMaxVelocity);

  var Traffic = {
    carIdx: 0,
    start: function() {
      const currentCar = cars[this.carIdx];
      carsStats.enter(this.time());

      const distanceToTrafficLight = this.carIdx * (betweenCarsLengthMeters + carLengthMeters);
      const waitForEvent = this.carIdx === 0 ? trafficLight : cars[this.carIdx - 1];
      this.waitEvent(waitForEvent).done(function () {
        const { currentCar, carIdx, distanceToTrafficLight, arrivedAt } = this.callbackData;

        const delay = random.uniform(0, 3);
        this.setTimer(delay).done(function() {
          currentCar.fire(true);
          sim.log(`Car #${carIdx} started moving`)

          let timeNeededToCrossIntersection = 0;
          let distanceNeedToCover = distanceToTrafficLight;

          if (distanceNeedToCover >= distanceTravelledToReachMaxVelocity) {
            timeNeededToCrossIntersection += timeNeededToReachMaxVelocity;
            distanceNeedToCover -= distanceTravelledToReachMaxVelocity;
          }

          timeNeededToCrossIntersection += distanceNeedToCover / maxVelocityMPS;

          this.setTimer(timeNeededToCrossIntersection).done(function() {
            carsStats.leave(arrivedAt, this.time());
            sim.log(`Car #${carIdx} crossed the intersection`);
            numCarCrossed += 1;
          })
        });
      }).setData({
        distanceToTrafficLight,
        arrivedAt: this.time(),
        currentCar,
        carIdx: this.carIdx
      })

      if (this.carIdx  < numCars - 1) {
        this.carIdx += 1;
        this.start();
      }
    }
  }

  // sim.setLogger(function (str) { console.log(str); });
  sim.addEntity(LightController);
  sim.addEntity(Traffic)
  sim.simulate(trafficLightGreenDurationSeconds)
  return numCarCrossed;
}