class ElevatorSystem {
  constructor() {
    this.elevators = [];
    this.elevatorHeight = 90.8;
    this.pendingCalls = [];
    this.activeCalls = [];
    this.initEventListeners();
  }

  initEventListeners() {
    document
      .querySelector("form")
      .addEventListener("submit", this.initializeElevatorSystem.bind(this));
    window.addEventListener("load", this.checkViewportSize.bind(this));
    window.addEventListener("resize", this.updateInputPlaceholders);
    window.addEventListener("load", this.updateInputPlaceholders);
    setInterval(this.elevatorManager.bind(this), 50);
  }

  initializeElevatorSystem(e) {
    e.preventDefault();
    const floorCount = parseInt(document.querySelector("#num_floors").value);
    const elevatorCount = parseInt(document.querySelector("#num_lifts").value);
    if (this.validateParameters(floorCount, elevatorCount)) {
      this.createElevatorInterface(floorCount, elevatorCount);
    }
  }

  checkViewportSize() {
    const viewportWidth = window.innerWidth;
    if (viewportWidth < 220) {
      alert("Device screen too small for elevator simulation.");
    }
  }

  updateInputPlaceholders() {
    document.querySelector("#num_floors").placeholder = "Floor count";
    document.querySelector("#num_lifts").placeholder = "Elevator count";
  }

  validateParameters(floors, elevators) {
    if (isNaN(elevators) || isNaN(floors)) {
      alert("Please fill in all fields");
      return false;
    } else if (floors <= 0 || elevators <= 0) {
      alert("Floor and elevator counts must be positive");
      return false;
    }
    return true;
  }

  handleCallButtonPress(e) {
    const button = e.target || e;
    const floorNum = this.extractNumberFromId(button.id);
    const callDirection = button.id.includes("up") ? "up" : "down";
    const callRequest = { floor: floorNum, direction: callDirection };
    if (!this.isCallAlreadyRegistered(callRequest)) {
      this.pendingCalls.push(callRequest);
      button.classList.add("active-" + callDirection);
    }
  }

  isCallAlreadyRegistered(call) {
    return (
      this.pendingCalls.some(
        (req) => req.floor === call.floor && req.direction === call.direction
      ) ||
      this.activeCalls.some(
        (req) =>
          req && req.floor === call.floor && req.direction === call.direction
      )
    );
  }

  findClosestIdleElevator(call) {
    let minDistance = Infinity;
    let closestElevator = null;
    this.elevators.forEach((elevator, index) => {
      if (elevator.status === "busy") {
        if (this.canAddIntermediateStop(elevator, call)) {
          closestElevator = elevator;
          return;
        }
      } else {
        const distance = Math.abs(call.floor - elevator.currentFloor);
        if (distance < minDistance) {
          minDistance = distance;
          closestElevator = elevator;
        }
      }
    });
    return closestElevator;
  }

  canAddIntermediateStop(elevator, call) {
    const activeCall = this.activeCalls[elevator.element.id.slice(8) - 1];
    if (!activeCall) return false;
    if (call.direction === "up") {
      return (
        activeCall.direction === "up" &&
        call.floor > elevator.currentFloor &&
        call.floor < activeCall.floor
      );
    } else {
      return (
        activeCall.direction === "down" &&
        call.floor < elevator.currentFloor &&
        call.floor > activeCall.floor
      );
    }
  }

  dispatchElevator(elevatorIndex, call) {
    this.pendingCalls = this.pendingCalls.filter(
      (req) => !(req.floor === call.floor && req.direction === call.direction)
    );
    const elevator = this.elevators[elevatorIndex - 1];
    if (elevator.status === "idle") {
      this.activeCalls[elevatorIndex - 1] = call;
      elevator.status = "busy";
    } else {
      elevator.stops.push(call);
      elevator.stops.sort((a, b) =>
        call.direction === "up" ? a.floor - b.floor : b.floor - a.floor
      );
    }

    const moveElevator = (targetFloor) => {
      const verticalDistance = (targetFloor - 1) * this.elevatorHeight * -1;
      const travelTime = Math.abs(targetFloor - elevator.currentFloor) * 2;
      elevator.element.style.transform = `translateY(${verticalDistance}px)`;
      elevator.element.style.transition = `${travelTime}s linear`;
      this.operateDoors(elevatorIndex, travelTime * 1000);
      setTimeout(() => {
        elevator.currentFloor = targetFloor;
        const callButton = document.querySelector(
          `#${call.direction}Btn${targetFloor}`
        );
        if (callButton) callButton.classList.remove("active-" + call.direction);
        if (elevator.stops.length > 0) {
          const nextStop = elevator.stops.shift();
          moveElevator(nextStop.floor);
        } else {
          elevator.status = "idle";
          this.activeCalls[elevatorIndex - 1] = null;
        }
      }, travelTime * 1000 + 5000);
    };
    moveElevator(call.floor);
  }

  operateDoors(elevatorIndex, delay) {
    setTimeout(() => this.openDoors(elevatorIndex), delay);
    setTimeout(() => this.closeDoors(elevatorIndex), delay + 2500);
  }

  openDoors(elevatorIndex) {
    const elevator = this.elevators[elevatorIndex - 1].element;
    elevator
      .querySelector(`#left-door${elevatorIndex}`)
      .classList.remove(`left-door-close`);
    elevator
      .querySelector(`#right-door${elevatorIndex}`)
      .classList.remove(`right-door-close`);
    elevator
      .querySelector(`#left-door${elevatorIndex}`)
      .classList.add(`left-door-open`);
    elevator
      .querySelector(`#right-door${elevatorIndex}`)
      .classList.add(`right-door-open`);
  }

  closeDoors(elevatorIndex) {
    const elevator = this.elevators[elevatorIndex - 1].element;
    elevator
      .querySelector(`#left-door${elevatorIndex}`)
      .classList.remove(`left-door-open`);
    elevator
      .querySelector(`#right-door${elevatorIndex}`)
      .classList.remove(`right-door-open`);
    elevator
      .querySelector(`#left-door${elevatorIndex}`)
      .classList.add(`left-door-close`);
    elevator
      .querySelector(`#right-door${elevatorIndex}`)
      .classList.add(`right-door-close`);
  }

  elevatorManager() {
    if (this.pendingCalls.length > 0) {
      for (let call of this.pendingCalls) {
        const availableElevator = this.findClosestIdleElevator(call);
        if (availableElevator) {
          const elevatorId = this.extractNumberFromId(
            availableElevator.element.id
          );
          this.dispatchElevator(elevatorId, call);
          break;
        }
      }
    }
  }

  createElevatorInterface(floorCount, elevatorCount) {
    const simulationContainer = document.querySelector("#liftSimulation");
    simulationContainer.innerHTML = "";
    for (let i = floorCount; i >= 1; i--) {
      const floorElement = document.createElement("div");
      floorElement.classList.add("floor");
      floorElement.style.width = `${100 + elevatorCount * 100}px`;
      const floorInfo = document.createElement("div");
      floorInfo.classList.add("lift-labels");
      const floorNumber = document.createElement("span");
      floorNumber.textContent = "F" + i;
      floorInfo.appendChild(floorNumber);
      const callButtons = document.createElement("div");
      callButtons.classList.add("buttons-container");
      if (i !== floorCount) {
        const upCall = document.createElement("button");
        upCall.id = "upBtn" + i;
        upCall.classList.add("upBtn");
        upCall.onclick = this.handleCallButtonPress.bind(this);
        upCall.innerHTML = "Up";
        callButtons.appendChild(upCall);
      }
      if (i !== 1) {
        const downCall = document.createElement("button");
        downCall.id = "downBtn" + i;
        downCall.classList.add("downBtn");
        downCall.onclick = this.handleCallButtonPress.bind(this);
        downCall.innerHTML = "Down";
        callButtons.appendChild(downCall);
      }
      floorInfo.appendChild(callButtons);
      floorElement.appendChild(floorInfo);
      if (i === 1) {
        for (let j = 1; j <= elevatorCount; j++) {
          const elevator = document.createElement("div");
          elevator.id = "elevator" + j;
          elevator.classList.add("lift");
          const leftDoor = document.createElement("div");
          leftDoor.id = "left-door" + j;
          leftDoor.classList.add("left-door");
          const rightDoor = document.createElement("div");
          rightDoor.id = "right-door" + j;
          rightDoor.classList.add("right-door");
          elevator.appendChild(leftDoor);
          elevator.appendChild(rightDoor);
          floorElement.appendChild(elevator);
        }
      }
      simulationContainer.appendChild(floorElement);
    }
    this.elevators = Array.from(document.querySelectorAll(".lift"), (el) => ({
      element: el,
      status: "idle",
      currentFloor: 1,
      stops: [],
    }));
    this.pendingCalls = [];
    this.activeCalls = Array(this.elevators.length).fill(null);
  }

  extractNumberFromId(idString) {
    const match = /\d+/.exec(idString);
    return match ? parseInt(match[0], 10) : null;
  }
}

// Initialize the elevator system
const elevatorSystem = new ElevatorSystem();
