//
// Copyright 2020-2021 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const { PvUnsupportedPlatformError } = require("./errors");

const SYSTEM_LINUX = "linux";
const SYSTEM_MAC = "darwin";
const SYSTEM_WINDOWS = "win32";

const X86_64 = "x64";
const ARM_32 = "arm";
const ARM_64 = "arm64";

const PLATFORM_BEAGLEBONE = "beaglebone";
const PLATFORM_JETSON = "jetson";
const PLATFORM_LINUX = "linux";
const PLATFORM_MAC = "mac";
const PLATFORM_RASPBERRY_PI = "raspberry-pi";
const PLATFORM_WINDOWS = "windows";

const ARM_CPU_64 = "-aarch64";
const ARM_CPU_CORTEX_A7 = "cortex-a7";
const ARM_CPU_CORTEX_A53 = "cortex-a53";
const ARM_CPU_CORTEX_A57 = "cortex-a57";
const ARM_CPU_CORTEX_A72 = "cortex-a72";

const SUPPORTED_NODEJS_SYSTEMS = new Set([
  SYSTEM_LINUX,
  SYSTEM_MAC,
  SYSTEM_WINDOWS
]);

const LIBRARY_PATH_PREFIX = "lib/";
const SYSTEM_TO_LIBRARY_PATH = new Map();
SYSTEM_TO_LIBRARY_PATH.set(
  `${SYSTEM_MAC}/${X86_64}`,
  `${PLATFORM_MAC}/x86_64/pv_porcupine.node`
);
SYSTEM_TO_LIBRARY_PATH.set(
    `${SYSTEM_MAC}/${ARM_64}`,
    `${PLATFORM_MAC}/arm64/pv_porcupine.node`
  );
SYSTEM_TO_LIBRARY_PATH.set(
  `${SYSTEM_LINUX}/${X86_64}`,
  `${PLATFORM_LINUX}/x86_64/pv_porcupine.node`
);
SYSTEM_TO_LIBRARY_PATH.set(
  `${SYSTEM_LINUX}/${ARM_CPU_CORTEX_A7}`,
  `${PLATFORM_RASPBERRY_PI}/${ARM_CPU_CORTEX_A7}/pv_porcupine.node`
);
SYSTEM_TO_LIBRARY_PATH.set(
  `${SYSTEM_LINUX}/${ARM_CPU_CORTEX_A53}`,
  `${PLATFORM_RASPBERRY_PI}/${ARM_CPU_CORTEX_A53}/pv_porcupine.node`
);
SYSTEM_TO_LIBRARY_PATH.set(
    `${SYSTEM_LINUX}/${ARM_CPU_CORTEX_A53}${ARM_CPU_64}`,
    `${PLATFORM_RASPBERRY_PI}/${ARM_CPU_CORTEX_A53}${ARM_CPU_64}/pv_porcupine.node`
);
SYSTEM_TO_LIBRARY_PATH.set(
  `${SYSTEM_LINUX}/${ARM_CPU_CORTEX_A72}`,
  `${PLATFORM_RASPBERRY_PI}/${ARM_CPU_CORTEX_A72}/pv_porcupine.node`
);
SYSTEM_TO_LIBRARY_PATH.set(
    `${SYSTEM_LINUX}/${ARM_CPU_CORTEX_A72}${ARM_CPU_64}`,
    `${PLATFORM_RASPBERRY_PI}/${ARM_CPU_CORTEX_A72}${ARM_CPU_64}/pv_porcupine.node`
);
SYSTEM_TO_LIBRARY_PATH.set(
    `${SYSTEM_LINUX}/${ARM_CPU_CORTEX_A57}`,
    `${PLATFORM_JETSON}/${ARM_CPU_CORTEX_A57}/pv_porcupine.node`
);
SYSTEM_TO_LIBRARY_PATH.set(
    `${SYSTEM_LINUX}/${PLATFORM_BEAGLEBONE}`,
    `${PLATFORM_BEAGLEBONE}/pv_porcupine.node`
);
SYSTEM_TO_LIBRARY_PATH.set(
    `${SYSTEM_WINDOWS}/${X86_64}`,
    `${PLATFORM_WINDOWS}/amd64/pv_porcupine.node`
);

function absoluteLibraryPath(libraryPath) {
  return path.resolve(__dirname, LIBRARY_PATH_PREFIX, libraryPath);
}

function getCpuPart() {
    const cpuInfo = fs.readFileSync("/proc/cpuinfo", "ascii");
    for (let infoLine of cpuInfo.split("\n")) {
      if (infoLine.includes("CPU part")) {
        let infoLineSplit = infoLine.split(' ')
        return infoLineSplit[infoLineSplit.length - 1].toLowerCase();
      }
    }
    throw PvUnsupportedPlatformError(`Unsupported CPU.`);
}

function getLinuxPlatform() {
    var cpuPart = getCpuPart(); 
    switch(cpuPart) {
        case "0xc07": 
        case "0xd03": 
        case "0xd08": return PLATFORM_RASPBERRY_PI;
        case "0xd07": return PLATFORM_JETSON;
        case "0xc08": return PLATFORM_BEAGLEBONE;
        default: 
            throw PvUnsupportedPlatformError(`Unsupported CPU: '${cpuPart}'`);
    }
}

function getLinuxMachine(arch) {
    let archInfo = ""
    if(arch == ARM_64) {
      archInfo = ARM_CPU_64;
    } 

    var cpuPart = getCpuPart(); 
    switch(cpuPart) {
        case "0xc07": return ARM_CPU_CORTEX_A7 + archInfo;
        case "0xd03": return ARM_CPU_CORTEX_A53 + archInfo;
        case "0xd07": return ARM_CPU_CORTEX_A57 + archInfo;
        case "0xd08": return ARM_CPU_CORTEX_A72 + archInfo;
        case "0xc08": return PLATFORM_BEAGLEBONE;
        default: 
            throw PvUnsupportedPlatformError(`Unsupported CPU: '${cpuPart}'`);
    }
}

function getPlatform() {
  const system = os.platform();
  const arch = os.arch();

  if (system === SYSTEM_MAC && (arch === X86_64 || arch === ARM_64)) {
    return PLATFORM_MAC;
  }

  if (system === SYSTEM_WINDOWS && arch === X86_64) {
    return PLATFORM_WINDOWS;
  }

  if (system === SYSTEM_LINUX) {
    if (arch === X86_64) {
      return PLATFORM_LINUX;
    } else {
      return getLinuxPlatform();
    }
  }

  throw `System ${system}/${arch} is not supported by this library.`;
}

function getSystemLibraryPath() {
  const system = os.platform();
  const arch = os.arch();

  if (SUPPORTED_NODEJS_SYSTEMS.has(system)) {
    switch (system) {
      case SYSTEM_MAC: {
        if (arch === X86_64) {
          return absoluteLibraryPath(
            SYSTEM_TO_LIBRARY_PATH.get(`${SYSTEM_MAC}/${X86_64}`)
          );
        }
        else if (arch == ARM_64) {
            return absoluteLibraryPath(
                SYSTEM_TO_LIBRARY_PATH.get(`${SYSTEM_MAC}/${ARM_64}`)
            )
        }
      }
      case SYSTEM_LINUX: {
        if (arch === X86_64) {
          return absoluteLibraryPath(
            SYSTEM_TO_LIBRARY_PATH.get(`${SYSTEM_LINUX}/${X86_64}`)
          );
        } else if (arch === ARM_32 || arch === ARM_64) {
          let linuxMachine = getLinuxMachine(arch);
          if (linuxMachine !== null) {
            return absoluteLibraryPath(
              SYSTEM_TO_LIBRARY_PATH.get(`${SYSTEM_LINUX}/${linuxMachine}`)
            );
          } else {
            throw new PvUnsupportedPlatformError(
              `System ${system}/${arch} is not supported by this library for this CPU.`
            );
          }
        }
      }
      case SYSTEM_WINDOWS: {
          if (arch == X86_64) {
            return absoluteLibraryPath(
                SYSTEM_TO_LIBRARY_PATH.get(`${SYSTEM_WINDOWS}/${X86_64}`)
              );
          }
      }
    }
  }

  throw new PvUnsupportedPlatformError(
    `System ${system}/${arch} is not supported by this library.`
  );
}

exports.getPlatform = getPlatform;
exports.getSystemLibraryPath = getSystemLibraryPath;
