import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSettingsStore } from '../../stores/settingsStore';
import './LiquidGlassBackground.css';

// 检测是否处于低性能模式
const isLowPowerMode = () => {
  // 检测电池状态
  if ('getBattery' in navigator) {
    return false; // 异步检测，先返回 false
  }
  // 检测是否为移动设备或低性能设备
  return navigator.hardwareConcurrency <= 4 || window.devicePixelRatio < 2;
};

// 简化的液态玻璃着色器 - 优化版本
const vertexShader = `
  varying vec2 vUv;
  uniform float uTime;
  
  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // 降低波浪复杂度
    float wave = sin(pos.x * 2.0 + uTime * 0.3) * 0.08;
    wave += cos(pos.y * 1.5 + uTime * 0.2) * 0.08;
    pos.z += wave;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uOpacity;
  
  // 简化的噪声函数
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  // 减少 fbm 迭代次数
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for(int i = 0; i < 3; i++) { // 从 4 减少到 3
      value += amplitude * smoothNoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    vec2 uv = vUv * 2.0;
    float t = uTime * 0.08; // 降低动画速度
    
    // 减少噪声层数
    float n1 = fbm(uv + t);
    float n2 = fbm(uv * 1.2 - t * 0.3);
    
    // 颜色混合
    vec3 color = mix(uColor1, uColor2, n1);
    color = mix(color, uColor3, n2 * 0.4);
    
    // 降低高光强度
    float highlight = pow(n2, 3.0) * 0.3;
    color += vec3(highlight);
    
    // 边缘柔化
    float edge = 1.0 - length(vUv - 0.5) * 1.2;
    edge = smoothstep(0.0, 0.5, edge);
    
    gl_FragColor = vec4(color, uOpacity * edge);
  }
`;

// 玻璃平面组件 - 优化版本
const GlassPlane: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  const { settings } = useSettingsStore();
  const frameCount = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#e3f2fd') },
      uColor2: { value: new THREE.Color('#bbdefb') },
      uColor3: { value: new THREE.Color('#90caf9') },
      uOpacity: { value: 0.7 },
    }),
    []
  );

  useEffect(() => {
    if (settings.theme === 'dark') {
      uniforms.uColor1.value.set('#1a1a2e');
      uniforms.uColor2.value.set('#16213e');
      uniforms.uColor3.value.set('#0f3460');
      uniforms.uOpacity.value = 0.8;
    } else {
      uniforms.uColor1.value.set('#e3f2fd');
      uniforms.uColor2.value.set('#bbdefb');
      uniforms.uColor3.value.set('#90caf9');
      uniforms.uOpacity.value = 0.7;
    }
  }, [settings.theme, uniforms]);

  useFrame((state) => {
    if (meshRef.current) {
      // 降低更新频率：每 2 帧更新一次
      frameCount.current++;
      if (frameCount.current % 2 === 0) {
        const material = meshRef.current.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = state.clock.elapsedTime;
      }
    }
  });

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 16, 16]} /> {/* 降低几何体细分 */}
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// 浮动方框粒子 - 优化版本（减少数量）
const BoxParticles: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { settings } = useSettingsStore();
  const frameCount = useRef(0);

  const particles = useMemo(() => {
    // 根据性能调整粒子数量
    const particleCount = isLowPowerMode() ? 10 : 15;
    const items = [];
    for (let i = 0; i < particleCount; i++) {
      items.push({
        position: [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 4,
        ] as [number, number, number],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
        scale: 0.05 + Math.random() * 0.08,
        speed: 0.15 + Math.random() * 0.2, // 降低速度
        color: settings.theme === 'dark'
          ? new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.8, 0.6)
          : new THREE.Color().setHSL(0.58 + Math.random() * 0.08, 0.7, 0.5),
      });
    }
    return items;
  }, [settings.theme]);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // 降低更新频率
    frameCount.current++;
    if (frameCount.current % 2 !== 0) return;
    
    const time = state.clock.elapsedTime;

    groupRef.current.children.forEach((child, i) => {
      const particle = particles[i];
      if (!particle) return;

      // 简化动画计算
      child.position.y = particle.position[1] + Math.sin(time * particle.speed + i) * 0.2;
      child.position.x = particle.position[0] + Math.cos(time * particle.speed * 0.5 + i) * 0.15;

      child.rotation.x = particle.rotation[0] + time * particle.speed * 0.2;
      child.rotation.y = particle.rotation[1] + time * particle.speed * 0.3;

      const breathe = 1 + Math.sin(time * 1.5 + i) * 0.1;
      child.scale.setScalar(particle.scale * breathe);
    });

    // 降低整体旋转速度
    groupRef.current.rotation.y = time * 0.01;
    groupRef.current.rotation.x = Math.sin(time * 0.05) * 0.03;
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position} rotation={particle.rotation}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={particle.color}
            transparent
            opacity={0.3} // 降低透明度
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

// 连接线效果 - 优化版本
const ConnectionLines: React.FC = () => {
  const linesRef = useRef<THREE.LineSegments>(null);
  const { settings } = useSettingsStore();
  const frameCount = useRef(0);

  const positions = useMemo(() => {
    const pos: number[] = [];
    // 减少粒子数量
    const particleCount = isLowPowerMode() ? 8 : 12;
    const particlePositions: [number, number, number][] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions.push([
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 3,
      ]);
    }

    // 减少连接线数量
    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const dist = Math.sqrt(
          Math.pow(particlePositions[i][0] - particlePositions[j][0], 2) +
          Math.pow(particlePositions[i][1] - particlePositions[j][1], 2) +
          Math.pow(particlePositions[i][2] - particlePositions[j][2], 2)
        );
        if (dist < 2.5) { // 减小连接距离
          pos.push(...particlePositions[i], ...particlePositions[j]);
        }
      }
    }

    return new Float32Array(pos);
  }, []);

  useFrame((state) => {
    if (!linesRef.current) return;
    // 降低更新频率
    frameCount.current++;
    if (frameCount.current % 3 !== 0) return;
    
    const material = linesRef.current.material as THREE.LineBasicMaterial;
    material.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 0.3) * 0.03;
  });

  const color = settings.theme === 'dark' ? '#4fc3f7' : '#0078d4';

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.1} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
};

// 浮动粒子 - 优化版本
const Particles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const { settings } = useSettingsStore();
  const frameCount = useRef(0);

  const positions = useMemo(() => {
    // 减少粒子数量
    const particleCount = isLowPowerMode() ? 15 : 20;
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    // 降低更新频率
    frameCount.current++;
    if (frameCount.current % 2 !== 0) return;
    
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
  });

  const color = settings.theme === 'dark' ? '#4fc3f7' : '#0078d4';

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05} // 减小粒子大小
        color={color}
        transparent
        opacity={0.4} // 降低透明度
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// 场景组件
const Scene: React.FC = () => {
  const { gl } = useThree();
  
  useEffect(() => {
    // 优化 WebGL 渲染器设置
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比
    gl.setSize(window.innerWidth, window.innerHeight);
    
    // 启用性能优化
    gl.shadowMap.enabled = false; // 禁用阴影
  }, [gl]);

  return (
    <>
      <GlassPlane />
      <BoxParticles />
      <ConnectionLines />
      <Particles />
    </>
  );
};

// 主组件
const LiquidGlassBackground: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    // 检测低功耗模式
    setIsLowPower(isLowPowerMode());

    // 检测页面可见性
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 检测电池状态
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const checkBattery = () => {
          // 电池电量低或正在省电模式时降低效果
          setIsLowPower(battery.level < 0.2 || battery.charging === false);
        };
        checkBattery();
        battery.addEventListener('levelchange', checkBattery);
        battery.addEventListener('chargingchange', checkBattery);
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 页面不可见时暂停渲染
  if (!isVisible) {
    return null;
  }

  return (
    <div className="liquid-glass-background" style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      pointerEvents: 'none',
    }}>
      <Canvas
        gl={{
          antialias: false, // 禁用抗锯齿以提升性能
          alpha: true,
          powerPreference: isLowPower ? 'low-power' : 'high-performance',
        }}
        dpr={Math.min(window.devicePixelRatio, 1.5)} // 限制 DPR
        frameloop="always"
        camera={{ position: [0, 0, 5], fov: 75 }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default LiquidGlassBackground;
